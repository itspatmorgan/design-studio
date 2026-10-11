import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { recordEvent, readEvents, reportEvents } from '../benchmarks/benchmark.mjs';
test('reports wall-clock setup, independent deployment, and complete user journey', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-benchmark-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'timing.jsonl');
  for (const [event, second] of [
    ['request-start', 0],
    ['setup-start', 2],
    ['studio-ready', 120],
    ['publish-start', 120],
    ['public-ready', 180],
    ['handoff-ready', 185],
    ['publish-end', 200],
    ['end', 200],
  ]) {
    recordEvent(file, event, new Date(second * 1000).toISOString());
  }
  assert.deepEqual(reportEvents(readEvents(file)).seconds, {
    setup: 118,
    deployment: 80,
    deploymentToPublic: 60,
    endToEnd: 200,
    requestToPublic: 180,
    afterPublic: 20,
  });
  assert.throws(() => recordEvent(file, 'end'), /already recorded/);
});
test('missing phase stays unknown and invalid chronology does not corrupt the log', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-benchmark-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'timing.jsonl');
  recordEvent(file, 'request-start', new Date(5000).toISOString());
  assert.equal(reportEvents(readEvents(file)).seconds.setup, null);
  assert.throws(() => recordEvent(file, 'end', new Date(0).toISOString()), /precedes/);
  assert.equal(readEvents(file).length, 1);
});
