import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesSystem, systemUsage } from './prototypeUsage.ts';
import type { PrototypeInfo } from './types';

const prototype = (index: number, system: string | null = 'product'): PrototypeInfo => ({
  id: String(index),
  title: 'Prototype ' + index,
  contributor: 'Team member',
  contributorKey: 'team',
  system,
  created: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
});

test('a large system collection reports the full active count with only three newest previews', () => {
  const prototypes = Array.from({ length: 100 }, (_, i) => prototype(i, i < 70 ? 'product' : 'marketing'));
  prototypes.push({ ...prototype(101), status: 'archived' }, prototype(102, null));
  const originalOrder = prototypes.map(p => p.id);
  const usage = systemUsage(prototypes, 'product');
  assert.equal(usage.count, 70);
  assert.deepEqual(
    usage.recent.map(p => p.id),
    ['69', '68', '67'],
  );
  assert.deepEqual(
    prototypes.map(p => p.id),
    originalOrder,
  );
  assert.equal(prototypes.filter(p => matchesSystem(p, 'product') && p.status !== 'archived').length, usage.count);
  assert.equal(prototypes.filter(p => matchesSystem(p)).length, prototypes.length);
});

test('small, empty, and undated collections remain usable', () => {
  const undated = { ...prototype(0), created: null };
  assert.deepEqual(
    systemUsage([undated, prototype(1)], 'product').recent.map(p => p.id),
    ['1', '0'],
  );
  assert.deepEqual(systemUsage([prototype(1, 'marketing')], 'product'), { count: 0, recent: [] });
  assert.deepEqual(systemUsage([], 'product'), { count: 0, recent: [] });
  assert.equal(matchesSystem(prototype(0, null), 'product'), false);
});
