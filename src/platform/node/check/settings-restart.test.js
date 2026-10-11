import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForRestart } from '../../app/settings/waitForRestart.ts';

test('settings restart waits through disconnection, old runtime, and pending new runtime', async () => {
  const replies = [
    new Error('Disconnected'),
    { runtimeId: 'old', restarting: false },
    { runtimeId: 'new', restarting: true },
    { runtimeId: 'new', restarting: false },
  ];
  let calls = 0;
  await waitForRestart('old', {
    signal: new AbortController().signal,
    pause: async () => {},
    request: async () => {
      calls++;
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  });
  assert.equal(calls, 4);
});

test('settings restart ends with a recoverable error instead of remaining disabled indefinitely', async () => {
  await assert.rejects(
    waitForRestart('old', {
      signal: new AbortController().signal,
      attempts: 2,
      pause: async () => {},
      request: async () => ({ runtimeId: 'old', restarting: false }),
    }),
    /settings were saved.*not finished restarting/,
  );
});

test('leaving Settings cancels restart recovery without requesting or reloading a page', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    waitForRestart('old', {
      signal: controller.signal,
      pause: async () => {
        controller.abort();
      },
      request: async () => {
        calls++;
        return { runtimeId: 'new', restarting: false };
      },
    }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 0);
});
