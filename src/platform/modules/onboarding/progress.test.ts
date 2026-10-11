import assert from 'node:assert/strict';
import { test } from 'node:test';
import { complete, isComplete, progressKey } from './progress.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claimWelcome } from './node/progress.js';
import server from './server.ts';
import check from './check.ts';
import { claimIntroduction, recordIntroduction } from './progress.ts';

test('onboarding completion persists and does not cross base paths', () => {
  const data = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  const key = progressKey('/studio-test/');
  assert.equal(isComplete(key, storage), false);
  assert.equal(complete(key, storage), true);
  assert.equal(data.get(key), 'complete');
  assert.equal(isComplete(progressKey('/other-studio/'), storage), false);
});

test('persisted completion is recognized without completing again', () => {
  assert.equal(
    isComplete(progressKey('/returning/'), () => ({ getItem: () => 'complete', setItem: () => assert.fail() })),
    true,
  );
});

test('blocked storage still allows the person to leave Welcome for this session', () => {
  const unavailable = () => {
    throw new Error('Storage blocked');
  };
  const key = progressKey('/blocked/');
  assert.equal(isComplete(key, unavailable), false);
  assert.equal(complete(key, unavailable), false);
  assert.equal(isComplete(key, unavailable), true);
});

const fixture = (t: { after: (fn: () => void) => void }) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-welcome-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.writeFileSync(
    path.join(root, 'contributors/owner.json'),
    JSON.stringify({ name: 'Owner', extra: 'keep', welcomeDismissed: false }),
  );
  fs.writeFileSync(
    path.join(root, 'contributors/newcomer.json'),
    JSON.stringify({ name: 'Newcomer', email: 'new@example.test', custom: { keep: true }, welcomeDismissed: false }),
  );
  return root;
};

test('each contributor gets Welcome once and keeps their own progress across restarts', t => {
  const root = fixture(t);
  assert.equal(claimWelcome(root, 'owner'), true);
  assert.equal(claimWelcome(root, 'owner'), false);
  assert.equal(claimWelcome(root, 'newcomer'), true);
  assert.equal(claimWelcome(root, 'newcomer'), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'contributors/newcomer.json'), 'utf8')), {
    name: 'Newcomer',
    email: 'new@example.test',
    custom: { keep: true },
    welcomeDismissed: true,
  });
  const owner = JSON.parse(fs.readFileSync(path.join(root, 'contributors/owner.json'), 'utf8'));
  assert.deepEqual(owner, { name: 'Owner', extra: 'keep', welcomeDismissed: true });
  const other = fixture(t);
  assert.equal(claimWelcome(other, 'owner'), true);
});

test('unregistered exploration and legacy studio state cannot dismiss a new contributor', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'studio.config.ts'), 'export default { welcomeDismissed: true };');
  fs.writeFileSync(path.join(root, '.design-studio-welcome-dismissed'), '');
  const before = fs.readFileSync(path.join(root, 'contributors/newcomer.json'), 'utf8');
  assert.equal(claimWelcome(root, null), null);
  assert.equal(fs.readFileSync(path.join(root, 'contributors/newcomer.json'), 'utf8'), before);
  assert.equal(claimWelcome(root, 'newcomer'), true);
  assert.equal(
    fs.readFileSync(path.join(root, 'studio.config.ts'), 'utf8'),
    'export default { welcomeDismissed: true };',
  );
});

test('progress preserves other roster entries and honors explicit false', t => {
  const root = fixture(t);
  const file = path.join(root, 'contributors/colleague.json');
  fs.writeFileSync(file, JSON.stringify({ name: 'Colleague', welcomeDismissed: true }));
  assert.equal(claimWelcome(root, 'owner'), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { name: 'Colleague', welcomeDismissed: true });
});

test('invalid, unknown and linked profiles are preserved', t => {
  const root = fixture(t);
  const file = path.join(root, 'contributors/newcomer.json');
  fs.writeFileSync(file, '{"name":"Newcomer","welcomeDismissed":"yes"}');
  assert.throws(() => claimWelcome(root, 'newcomer'), /false or true/);
  assert.match(fs.readFileSync(file, 'utf8'), /"yes"/);
  assert.throws(() => claimWelcome(root, '../elsewhere'), /Invalid contributor/);
  assert.throws(() => claimWelcome(root, 'unknown'), /not registered/);
  fs.unlinkSync(file);
  fs.symlinkSync(path.join(root, 'contributors/owner.json'), file);
  assert.throws(() => claimWelcome(root, 'newcomer'), /ordinary file/);
  fs.unlinkSync(file);
  fs.writeFileSync(file, '[]');
  assert.throws(() => claimWelcome(root, 'newcomer'), /object/);
});

test('browser fallback progress does not cross contributor identities', () => {
  assert.notEqual(progressKey('/', 'owner'), progressKey('/', 'newcomer'));
  assert.notEqual(progressKey('/', null), progressKey('/', 'newcomer'));
});

test('Welcome route rejects arbitrary paths and unsupported actions', async () => {
  for (const body of [
    null,
    [],
    { action: 'delete' },
    { action: 'claim', path: '/tmp/elsewhere' },
    { action: 'claim', contributor: 'owner' },
  ]) {
    assert.equal((await server.progress({ me: null, body })).status, 400);
  }
});

test('effect replay shares one claim and returning after display cannot reopen it', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return new Response(JSON.stringify({ show: true }));
  });
  const key = progressKey('/effect-replay/');
  const first = claimIntroduction(key);
  assert.equal(claimIntroduction(key), first);
  assert.equal(await first, true);
  recordIntroduction(key);
  assert.equal(await claimIntroduction(key), false);
  assert.equal(calls, 1);
});

test('unregistered claims use browser fallback while registered claims use profile state', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ show: null })));
  const key = progressKey('/unregistered-fallback/');
  complete(key);
  assert.equal(await claimIntroduction(key), false);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ show: true })));
  const registered = progressKey('/unregistered-fallback/', 'newcomer');
  complete(registered);
  assert.equal(await claimIntroduction(registered), true);
});

test('missing declarations fail validation and runtime without changing the profile', t => {
  const root = fixture(t);
  assert.deepEqual(check({ root }), []);
  const file = path.join(root, 'contributors/newcomer.json');
  const source = '{"name":"Newcomer"}';
  fs.writeFileSync(file, source);
  assert.match(check({ root }).join(' '), /newcomer.*declare welcomeDismissed explicitly/);
  assert.throws(() => claimWelcome(root, 'newcomer'), /declare.*explicitly/i);
  assert.equal(fs.readFileSync(file, 'utf8'), source);
  fs.writeFileSync(file, '{"name":"Newcomer","welcomeDismissed":true}');
  assert.deepEqual(check({ root }), []);
  assert.equal(claimWelcome(root, 'newcomer'), false);
});

test('a missing profile declaration cannot activate browser fallback', async t => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ error: 'Declare welcomeDismissed.' }), { status: 422 }),
  );
  assert.equal(await claimIntroduction(progressKey('/invalid-declaration/', 'newcomer')), false);
});
