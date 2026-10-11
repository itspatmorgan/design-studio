import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPENING_WAIT_MS, openingReady, settledEmbeds } from './opening.ts';

test('opening waits for every initial visible embed, including ones not admitted yet', () => {
  assert.equal(openingReady(['first', 'queued'], new Set(['first', 'offscreen']), 500), false);
  assert.equal(openingReady(['first', 'queued'], new Set(['first', 'queued']), 600), true);
  assert.equal(openingReady([], new Set(), 0), true);
});

test('a stalled or unsupported embed cannot extend the opening deadline', () => {
  assert.equal(openingReady(['stalled'], new Set(), OPENING_WAIT_MS - 1), false);
  assert.equal(openingReady(['stalled'], new Set(), OPENING_WAIT_MS), true);
});

test('renderer commits and errors settle independently of source freshness', () => {
  const embeds = ['ready', 'error', 'loading', 'placeholder'].map(state => ({
    dataset: { canvasEmbedId: state },
    querySelector(selector: string) {
      // Published previews may have unknown source freshness. Their render status still works.
      assert.ok(!selector.includes('freshness'));
      return state === 'ready' || state === 'error' ? {} : null;
    },
  }));
  const container = { querySelectorAll: () => embeds } as unknown as HTMLElement;
  assert.deepEqual([...settledEmbeds(container)], ['ready', 'error']);
});
