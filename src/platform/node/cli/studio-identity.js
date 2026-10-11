import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditResourceIdentities } from '../lib/resource-identity-audit.js';
import { INSTALLED_FILE_TYPES } from '../lib/installed-file-types.js';
import {
  planResourceFoundationMigration,
  applyResourceFoundationMigration,
} from '../lib/resource-foundation-migration.js';
import { planPrototypeIdentification, applyPrototypeIdentification } from '../lib/prototype-identification.js';
import { parseConfigFile } from '../../core/config-file.ts';
import { resolveStudioReferences } from '../../core/resourceReferences.ts';
import { readResourceDirectory } from '../lib/resource-directory.js';
import { CONFIG_FILE, studioRole } from '../../core/config.ts';
import { resolveContributor, loadContributors } from './resolve-contributor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const [command, ...args] = process.argv.slice(2);
const positional = [],
  flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--') continue;
  if (['--yes', '--json'].includes(args[i])) flags[args[i].slice(2)] = true;
  else if (args[i] === '--out' && args[i + 1] && !args[i + 1].startsWith('--')) flags.out = args[++i];
  else if (args[i].startsWith('--')) throw new Error(`Unknown or incomplete option ${args[i]}.`);
  else positional.push(args[i]);
}
const usage = text => {
  throw new Error(`Usage: pnpm studio ${text}`);
};
const allowed = keys => {
  if (Object.keys(flags).some(key => !keys.includes(key))) usage(command);
};
const emit = (value, message) => console.log(flags.json ? JSON.stringify(value, null, 2) : message);

if (command === 'identity-audit') {
  allowed(['json']);
  if (positional.length) usage('identity-audit [--json]');
  const audit = auditResourceIdentities(ROOT, INSTALLED_FILE_TYPES);
  emit(
    audit,
    `${audit.resources.length} resources; ${audit.missing.length} missing identities.\n${audit.problems.join('\n')}`,
  );
  if (audit.problems.length || audit.missing.length) process.exitCode = 1;
} else if (command === 'identity-plan') {
  allowed(['json', 'out']);
  if (positional.length) usage('identity-plan [--out <new-file>] [--json]');
  const plan = planResourceFoundationMigration(ROOT, INSTALLED_FILE_TYPES);
  if (flags.out) fs.writeFileSync(path.resolve(flags.out), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  emit(
    plan,
    `${plan.changes.length} file(s) would change. Source is unchanged.${flags.out ? ` Preview saved to ${path.resolve(flags.out)}.` : ' Use --out to save a reviewable preview.'}`,
  );
} else if (command === 'identity-apply') {
  allowed(['yes', 'json']);
  if (positional.length !== 1) usage('identity-apply <reviewed-preview.json> [--yes] [--json]');
  const plan = JSON.parse(fs.readFileSync(path.resolve(positional[0]), 'utf8'));
  if (!flags.yes)
    emit(plan, `${plan.changes?.length ?? 0} reviewed file change(s). Apply the reviewed preview with --yes.`);
  else {
    // Evaluate current authority, never the proposed post-migration grants. Only
    // this one-time migrator interprets historical source-key relationships.
    const declaration = parseConfigFile(fs.readFileSync(path.join(ROOT, CONFIG_FILE), 'utf8'));
    if ('error' in declaration) throw new Error(declaration.error);
    const persisted = declaration.value;
    const config = /^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(persisted.defaultSystem ?? '')
      ? resolveStudioReferences(persisted, readResourceDirectory(ROOT))
      : persisted;
    if (studioRole(config, resolveContributor(), Object.keys(loadContributors())) !== 'admin')
      throw new Error('Only an existing Admin can apply a studio-wide identity migration.');
    const marker = path.join(ROOT, '.studio-system-operation');
    fs.closeSync(fs.openSync(marker, 'wx'));
    try {
      const result = applyResourceFoundationMigration(ROOT, INSTALLED_FILE_TYPES, plan);
      emit(result, `Migrated ${result.changed} file(s); verified ${result.resources.length} permanent identities.`);
    } finally {
      fs.unlinkSync(marker);
    }
  }
} else if (command === 'identify') {
  allowed(['yes', 'json']);
  if (positional.length !== 1) usage('identify <prototype-folder> [--yes] [--json]');
  const actor = resolveContributor();
  const plan = planPrototypeIdentification(ROOT, INSTALLED_FILE_TYPES, positional[0], actor);
  const result = flags.yes ? applyPrototypeIdentification(ROOT, INSTALLED_FILE_TYPES, plan, actor) : plan;
  emit(
    result,
    flags.yes
      ? `Assigned missing identities in ${plan.folder} (${result.changed} file(s)); existing identities retained.`
      : `${plan.changes.length} file(s) need identities in ${plan.folder}. Review with --json; apply with --yes.`,
  );
}
