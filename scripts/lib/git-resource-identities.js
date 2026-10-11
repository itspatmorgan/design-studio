import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { auditResourceIdentities } from './resource-identity-audit.js';

// Build the same retained identity inventory from Git, never from the checkout.
// Staged checks inspect index blobs; CI inspects the explicitly requested tree.
export function gitResourceIdentities(
  ref,
  types,
  { cwd = process.cwd(), staged = false, legacyOwnership = false } = {},
) {
  if (ref === 'empty-tree' && !staged) return { resources: [], missing: [], problems: [] };
  const git = args =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    });
  const output = git(staged ? ['ls-files', '--stage', '-z'] : ['ls-tree', '-r', '-z', ref]);
  const entries = output
    .split('\0')
    .filter(Boolean)
    .map(entry => {
      const tab = entry.indexOf('\t'),
        header = entry.slice(0, tab).split(' '),
        file = entry.slice(tab + 1);
      if (staged && header[2] !== '0') throw new Error('Resolve index conflicts before checking resource identity.');
      return { mode: header[0], oid: header[staged ? 1 : 2], file };
    });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-git-identities-'));
  try {
    for (const { mode, oid, file } of entries) {
      const parts = file.split('/');
      if (parts.some(part => part.startsWith('.') || part === 'node_modules')) continue;
      const profile = /^contributors\/[^/]+\.json$/.test(file);
      const system = /^src\/systems\/[^/]+\/system\.ts$/.test(file);
      const prototype =
        /^src\/prototypes\/[^/]+\/[^/]+\//.test(file) && !parts.slice(4).some(part => part.startsWith('_'));
      const artifact =
        prototype &&
        Object.values(types).some(
          type => type.inPrototype && type.extensions.some(extension => file.endsWith(extension)),
        );
      const metadata = /^src\/prototypes\/[^/]+\/[^/]+\/meta\.json$/.test(file);
      const symbolic = mode === '120000' && /^(?:contributors|src\/(?:systems|prototypes))(?:\/|$)/.test(file);
      if (!(profile || system || artifact || metadata || symbolic)) continue;
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (symbolic) fs.symlinkSync('unavailable-source-target', target);
      else if (mode === '100644' || mode === '100755') fs.writeFileSync(target, git(['cat-file', 'blob', oid]));
      else throw new Error(`${file}: resource declarations must be ordinary Git files.`);
    }
    const inventory = auditResourceIdentities(root, types);
    // Ownership participates in before/after comparison as well as the audit's
    // owner-to-folder validation. Missing owners are checked by the change policy.
    for (const resource of inventory.resources)
      if (resource.kind === 'prototype') {
        const metadata = JSON.parse(fs.readFileSync(path.join(root, resource.path), 'utf8'));
        const ownerContributorId = metadata.ownerContributorId ?? (legacyOwnership ? metadata.ownerId : undefined);
        if (
          legacyOwnership &&
          ownerContributorId !== undefined &&
          !inventory.resources.some(
            person =>
              person.kind === 'contributor' &&
              person.key === resource.ownerKey &&
              person.studioId === ownerContributorId,
          )
        )
          inventory.problems.push(`${resource.path}: historical owner must match its contributor folder.`);
        if (ownerContributorId !== undefined) resource.ownerContributorId = ownerContributorId;
      }
    return inventory;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
