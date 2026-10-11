import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { knowledgeOwners, skillCatalog, syncSkillAdapters } from './agent-skills.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-skills-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const owners = knowledgeOwners([{ id: 'canvas', label: 'Canvas' }], {
    marketing: { label: 'Marketing', dir: 'src/systems/marketing/' },
  });
  for (const owner of owners) {
    write(
      `${owner.root}/skills/review/SKILL.md`,
      '---\nname: review\ndescription: Review relevant work.\n---\nRead [details](references/details.md).',
    );
    write(`${owner.root}/skills/review/references/details.md`, '# Canonical details');
  }
  return { root, write, owners, catalog: skillCatalog(root, owners) };
}

test('project exposure keeps canonical resources, unique owner names, and working host links', t => {
  const { root, catalog } = fixture(t);
  assert.equal(new Set(catalog.map(s => s.name)).size, 3);
  assert.equal(syncSkillAdapters(root, catalog).warnings.length, 0);
  assert.equal(syncSkillAdapters(root, catalog).changed, 0);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  for (const s of catalog) {
    const entry = path.join(root, '.agents/skills', s.name, 'SKILL.md');
    const text = fs.readFileSync(entry, 'utf8');
    const target = text.match(/\[canonical [^\]]+\]\(([^)]+)\)/)[1];
    assert.equal(
      fs.readFileSync(path.resolve(path.dirname(entry), target), 'utf8'),
      fs.readFileSync(path.join(root, s.source), 'utf8'),
    );
    assert.equal(fs.realpathSync(path.join(root, '.claude/skills', s.name, 'SKILL.md')), fs.realpathSync(entry));
    assert.ok(!fs.existsSync(path.join(path.dirname(entry), 'references')), 'references stay canonical');
  }
  assert.match(
    fs.readFileSync(path.join(root, '.agents/skills/studio-system-marketing-review/SKILL.md'), 'utf8'),
    /assigned to system marketing/,
  );
});

test('disabled and removed capability exposure is removed while user entries and modifications survive', t => {
  const { root, catalog, write } = fixture(t);
  write('CLAUDE.md', 'My project instructions');
  syncSkillAdapters(root, catalog);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'My project instructions');
  const edited = '.agents/skills/studio-system-marketing-review/SKILL.md';
  write(edited, 'User edited this entry');
  write('.agents/skills/personal/SKILL.md', 'Personal skill');
  const result = syncSkillAdapters(
    root,
    catalog.filter(s => s.owner.kind === 'platform'),
  );
  assert.equal(fs.readFileSync(path.join(root, edited), 'utf8'), 'User edited this entry');
  assert.match(result.warnings.join('\n'), /Preserved modified obsolete/);
  assert.ok(!fs.existsSync(path.join(root, '.agents/skills/studio-module-canvas-review')));
  assert.ok(!fs.existsSync(path.join(root, '.claude/skills/studio-module-canvas-review')));
  assert.equal(fs.readFileSync(path.join(root, '.agents/skills/personal/SKILL.md'), 'utf8'), 'Personal skill');
});

test('collision does not overwrite a user skill and unsafe directory links are rejected', t => {
  const { root, catalog, write } = fixture(t);
  write('.agents/skills/studio-platform-review/SKILL.md', 'User skill');
  const result = syncSkillAdapters(root, catalog);
  assert.match(result.warnings.join('\n'), /user-owned/);
  assert.equal(
    fs.readFileSync(path.join(root, '.agents/skills/studio-platform-review/SKILL.md'), 'utf8'),
    'User skill',
  );
  assert.ok(
    !fs.existsSync(path.join(root, '.claude/skills/studio-platform-review')),
    'a collision is not exposed to another host',
  );
  fs.rmSync(path.join(root, '.agents/skills'), { recursive: true });
  fs.symlinkSync(os.tmpdir(), path.join(root, '.agents/skills'), 'dir');
  assert.throws(() => syncSkillAdapters(root, catalog), /unsafe|cannot leave/);
});

test('legacy dangling links migrate, and malformed skill metadata prevents exposure', t => {
  const { root, catalog, write, owners } = fixture(t);
  for (const host of ['.agents', '.claude']) {
    fs.mkdirSync(path.join(root, host));
    fs.symlinkSync('../src/systems/platform/skills', path.join(root, host, 'skills'), 'dir');
  }
  syncSkillAdapters(root, catalog);
  assert.ok(fs.lstatSync(path.join(root, '.agents/skills')).isDirectory());
  write('src/platform/skills/review/SKILL.md', '---\nname: other\ndescription: Review\n---');
  assert.throws(() => skillCatalog(root, owners), /have to match/);
});

test('read-only checks detect missing, stale, and modified entries without writing', t => {
  const { root, catalog, write } = fixture(t);
  assert.ok(syncSkillAdapters(root, catalog, { check: true }).changed > 0);
  assert.ok(!fs.existsSync(path.join(root, '.agents')));
  assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md')));
  syncSkillAdapters(root, catalog);
  assert.equal(syncSkillAdapters(root, catalog, { check: true }).changed, 0);
  const receipt = fs.readFileSync(path.join(root, '.agents/studio-skills.json'), 'utf8');
  const entry = '.agents/skills/studio-platform-review/SKILL.md';
  write(entry, 'My modified instructions');
  const result = syncSkillAdapters(root, catalog, { check: true });
  assert.ok(result.warnings.length);
  assert.equal(fs.readFileSync(path.join(root, entry), 'utf8'), 'My modified instructions');
  assert.equal(fs.readFileSync(path.join(root, '.agents/studio-skills.json'), 'utf8'), receipt);
  assert.ok(syncSkillAdapters(root, catalog.slice(0, 1), { check: true }).changed > 0);
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/studio-module-canvas-review')));
});
