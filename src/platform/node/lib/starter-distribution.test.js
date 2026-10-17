import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { starterDistributionProblems } from './starter-distribution.js';

function checkout(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starter-distribution-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  return { dir, git, write };
}

test('distribution rejects ignored personal work even when Git reports a clean checkout', t => {
  const { dir, git, write } = checkout(t);
  fs.appendFileSync(path.join(dir, '.git/info/exclude'), '\n/contributors/local.json\n/src/prototypes/local/\n');
  write('contributors/local.json', JSON.stringify({ name: 'Local Person' }));
  write('src/prototypes/local/draft/meta.json', '{}');
  assert.equal(git('status', '--porcelain'), '');
  const problems = starterDistributionProblems(dir).join('\n');
  assert.match(problems, /contributors\/local.json/);
  assert.match(problems, /src\/prototypes\/local\/draft\/meta.json/);
});

test('upstream distribution permits fictional samples and refuses personal identities and grants', t => {
  const { dir, git, write } = checkout(t);
  write('contributors/samples.json', JSON.stringify({ name: 'Fictional Person', sample: true, email: '', github: '' }));
  write('studio.config.json', JSON.stringify({ usage: 'personal', admins: [], systemMaintainers: {} }));
  git('add', 'contributors', 'studio.config.json');
  assert.deepEqual(starterDistributionProblems(dir), []);
  write('contributors/samples.json', JSON.stringify({ name: 'Real Person', email: '', github: 'real-person' }));
  assert.match(starterDistributionProblems(dir).join('\n'), /fictional sample contributors/);
  write('contributors/samples.json', JSON.stringify({ name: 'Fictional Person', sample: true, email: '', github: '' }));
  write('studio.config.json', JSON.stringify({ usage: 'personal', admins: ['person-id'], systemMaintainers: {} }));
  assert.match(starterDistributionProblems(dir).join('\n'), /no Admin/);
});
