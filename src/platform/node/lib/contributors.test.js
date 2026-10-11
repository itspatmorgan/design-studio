import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { readContributors } from './contributors.js';
import { writeProfiles } from './fixtures/contributors.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-profiles-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('profiles use filename keys and retain each person’s preferences independently', t => {
  const root = fixture(t);
  writeProfiles(root, { sam: { name: 'Sam', custom: { keep: true } }, alex: { name: 'Alex', welcomeDismissed: true } });
  const result = readContributors(root);
  assert.deepEqual(Object.keys(result.contributors), ['alex', 'sam']);
  assert.deepEqual(result.contributors.sam.custom, { keep: true });
  assert.equal(result.contributors.alex.welcomeDismissed, true);
  assert.deepEqual(result.problems, []);
});

test('profile validation catches missing declarations and ambiguous identities', t => {
  const root = fixture(t);
  writeProfiles(root, {
    sam: { name: 'Sam', email: 'sam@example.test', github: 'sam' },
    alex: { name: 'Alex', email: 'SAM@example.test', github: 'SAM' },
  });
  assert.equal(readContributors(root).problems.length, 2);
  fs.writeFileSync(path.join(root, 'contributors/alex.json'), JSON.stringify({ name: '', welcomeDismissed: 'yes' }));
  const { problems } = readContributors(root);
  for (const field of ['name', 'email', 'github', 'welcomeDismissed']) assert.ok(problems.some(p => p.includes(field)));
});

test('linked profiles, invalid keys, and non-object profiles are rejected', t => {
  const root = fixture(t);
  writeProfiles(root, { sam: { name: 'Sam' } });
  fs.symlinkSync(path.join(root, 'contributors/sam.json'), path.join(root, 'contributors/alex.json'));
  fs.writeFileSync(path.join(root, 'contributors/Bad.json'), '{}');
  fs.writeFileSync(path.join(root, 'contributors/invalid.json'), '[]');
  const { contributors, problems } = readContributors(root);
  assert.deepEqual(Object.keys(contributors), ['sam']);
  assert.equal(problems.length, 3);
});

test('profile identities reject malformed, duplicated and ambiguously declared permanent IDs', t => {
  const root = fixture(t);
  writeProfiles(root, {
    pat: { name: 'Pat', studioId: '0123456789abcdef' },
    alex: { name: 'Alex', studioId: '0123456789abcdef' },
  });
  assert.ok(readContributors(root).problems.some(problem => problem.includes('studioId is also registered')));
  fs.writeFileSync(
    path.join(root, 'contributors/alex.json'),
    '{"name":"Alex","email":"","github":"","studioId":"bad"}',
  );
  assert.ok(readContributors(root).problems.some(problem => problem.includes('exactly 16')));
  fs.writeFileSync(
    path.join(root, 'contributors/alex.json'),
    '{"name":"Alex","email":"","github":"","studioId":"0123456789abcdef","studioId":"abcdefghjkmnpqrs"}',
  );
  assert.ok(readContributors(root).problems.some(problem => problem.includes('studioId only once')));
  fs.writeFileSync(
    path.join(root, 'contributors/alex.json'),
    '{"name":"Alex","email":"","github":"","github":"pat","studioId":"abcdefghjkmnpqrs"}',
  );
  assert.ok(readContributors(root).problems.some(problem => problem.includes('github only once')));
});

test('a profile without the current formatVersion is a problem that names the file', t => {
  const root = fixture(t);
  writeProfiles(root, { sam: { name: 'Sam' } });
  assert.deepEqual(readContributors(root).problems, []);
  const file = path.join(root, 'contributors/sam.json');
  const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete profile.formatVersion;
  fs.writeFileSync(file, JSON.stringify(profile));
  assert.match(readContributors(root).problems.join('\n'), /contributors\/sam\.json: add "formatVersion": 1/);
  fs.writeFileSync(file, JSON.stringify({ ...profile, formatVersion: 2 }));
  assert.match(readContributors(root).problems.join('\n'), /contributors\/sam\.json: formatVersion is 2/);
});
