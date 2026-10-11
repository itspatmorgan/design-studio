import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareFile } from '../../src/platform/app/data/fileTypeModule.ts';
import { createRefreshQueue } from '../../src/platform/app/data/refreshQueue.ts';

const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
};
const tick = () => new Promise(r => setImmediate(r));

test('a destination is prepared only after both its file and renderer are ready', async () => {
  const file = deferred();
  const renderer = deferred();
  let done = false;
  const props = { text: 'Destination' };
  const Page = Object.assign(() => null, { preload: () => renderer.promise });
  const module = {
    Page,
    load: async () => {
      await file.promise;
      return props;
    },
  };
  const result = prepareFile(module, {}).then(value => {
    done = true;
    return value;
  });
  file.resolve();
  await tick();
  assert.equal(done, false);
  renderer.resolve();
  assert.equal(await result, props);
});

test('preparation propagates failures and supports eager renderers and unavailable files', async () => {
  const module = { Page: () => null, load: async () => undefined };
  assert.equal(await prepareFile(module, {}), undefined);
  module.load = async () => {
    throw new Error('Disconnected');
  };
  await assert.rejects(prepareFile(module, {}), /Disconnected/);
});

test('live updates coalesce and serialize without losing edits that arrive during a refresh', async () => {
  const callbacks = [];
  const jobs = [];
  const request = createRefreshQueue(
    () => {
      const job = deferred();
      jobs.push(job);
      return job.promise;
    },
    callback => callbacks.push(callback),
  );
  request();
  request();
  request();
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.equal(jobs.length, 1);
  request();
  request();
  assert.equal(callbacks.length, 0);
  jobs[0].resolve();
  await tick();
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.equal(jobs.length, 2);
  jobs[1].resolve();
  await tick();
  assert.equal(callbacks.length, 0);
  request();
  assert.equal(callbacks.length, 1);
});

test('Markdown readers accept live changes and keep reference variants separate across glob replacement', async () => {
  const { createMarkdownLoader } = await import('../../src/platform/app/docs/createMarkdownLoader.ts');
  const originalWindow = globalThis.window;
  const events = new EventTarget();
  globalThis.window = events;
  const disposed = [];
  const hot = { data: {}, dispose: callback => disposed.push(callback) };
  const referenceHot = { data: {}, dispose: callback => disposed.push(callback) };
  try {
    const path = '/platform/context/example.md';
    const normal = createMarkdownLoader({ [path]: async () => 'Original' }, hot);
    const reference = createMarkdownLoader({ [path]: async () => 'Original reference' }, referenceHot, true);
    events.dispatchEvent(new CustomEvent('studio:markdown', { detail: { key: path, mod: 'Updated' } }));
    assert.equal(await normal(path), 'Updated');
    assert.equal(await reference(path), 'Original reference');
    events.dispatchEvent(
      new CustomEvent('studio:markdown', { detail: { key: path, mod: 'Updated reference', reference: true } }),
    );
    assert.equal(await reference(path), 'Updated reference');
    disposed[0]();
    createMarkdownLoader({ [path]: async () => 'Old import', '/new.md': async () => 'New file' }, hot);
    assert.equal(await normal('/new.md'), 'New file');
    assert.equal(await normal(path), 'Updated');
    assert.equal(normal('/absent.md'), undefined);
  } finally {
    disposed.forEach(dispose => dispose());
    globalThis.window = originalWindow;
  }
});
