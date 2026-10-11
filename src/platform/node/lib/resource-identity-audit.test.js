import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { auditResourceIdentities } from './resource-identity-audit.js';
import { markdownIdentity, viewIdentity } from '../../core/resourceIdentity.ts';

const types = {
  view: { inPrototype: true, extensions: ['.tsx'], identity: viewIdentity },
  document: { inPrototype: true, extensions: ['.md'], identity: markdownIdentity },
};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-identity-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, text);
  };
  write('contributors/pat.json', '{"name":"Pat"}');
  write('src/systems/product/system.ts', 'export default { role: "prototype", label: "Product" };');
  write('src/prototypes/pat/example/meta.json', '{"title":"Example","status":"archived"}');
  write('src/prototypes/pat/example/main.tsx', 'export default null;');
  write('src/prototypes/pat/example/notes.md', '# Notes\n');
  write('src/prototypes/pat/example/_helper.tsx', 'export default null;');
  return { root, write };
}

test('identity audit includes archived work and installed file types without changing any source', t => {
  const { root } = fixture(t);
  const before = fs.readFileSync(path.join(root, 'src/prototypes/pat/example/main.tsx'), 'utf8');
  const report = auditResourceIdentities(root, types);
  assert.equal(report.resources.length, 5);
  assert.equal(report.missing.length, 5);
  assert.deepEqual(report.problems, []);
  assert.equal(report.resources.find(item => item.kind === 'artifact').ownerKey, 'pat');
  assert.equal(fs.readFileSync(path.join(root, 'src/prototypes/pat/example/main.tsx'), 'utf8'), before);
  assert.ok(!report.resources.some(item => item.path.includes('_helper')));
});

test('identity audit rejects duplicate identity across resource kinds and malformed source identity', t => {
  const { root, write } = fixture(t);
  write('contributors/pat.json', '{"studioId":"0123456789abcdef"}');
  write('src/prototypes/pat/example/main.tsx', '/** @studio-id 0123456789abcdef */\nexport default null;');
  write('src/prototypes/pat/example/notes.md', '---\nstudioId: broken\n---\n');
  const report = auditResourceIdentities(root, types);
  assert.equal(report.problems.length, 2);
  assert.match(report.problems.join('\n'), /already declared in contributors\/pat.json/);
  assert.match(report.problems.join('\n'), /exactly 16/);
});

test('identity audit refuses symbolic source paths rather than inspecting an external target', t => {
  const { root } = fixture(t);
  fs.symlinkSync(path.join(root, 'contributors/pat.json'), path.join(root, 'src/prototypes/pat/example/linked.md'));
  const report = auditResourceIdentities(root, types);
  assert.match(report.problems.join('\n'), /artifact paths cannot be symbolic links/);
  assert.ok(!report.resources.some(item => item.path.endsWith('linked.md')));
});

test('declared prototype owner must match its current contributor folder', t => {
  const { root, write } = fixture(t);
  write('contributors/pat.json', '{"studioId":"0123456789abcdef"}');
  write('src/prototypes/pat/example/meta.json', '{"title":"Example","ownerContributorId":"abcdefghjkmnpqrs"}');
  assert.match(auditResourceIdentities(root, types).problems.join('\n'), /ownerContributorId must match/);
  write('src/prototypes/pat/example/meta.json', '{"title":"Example","ownerContributorId":"0123456789abcdef"}');
  assert.deepEqual(auditResourceIdentities(root, types).problems, []);
});
