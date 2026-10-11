import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfigFile, serializeConfig, withModule, withSettings } from './config-file.ts';
import type { StudioConfig } from './config.ts';

const base: StudioConfig = {
  $schema: './src/platform/core/studio.config.schema.json',
  name: 'Studio',
  usage: 'personal',
  modules: { canvas: true, text: false },
  systems: ['product'],
  systemMaintainers: { aaaaaaaaaaaaaaaa: [] },
  defaultSystem: 'aaaaaaaaaaaaaaaa',
};

test('the file is parsed as plain JSON and bad text says what is wrong', () => {
  assert.deepEqual(parseConfigFile(serializeConfig(base)), { value: base });
  assert.match((parseConfigFile('{ name: 1 }') as { error: string }).error, /not valid JSON/);
  assert.match((parseConfigFile('[]') as { error: string }).error, /must be a JSON object/);
  assert.match((parseConfigFile('null') as { error: string }).error, /must be a JSON object/);
  assert.match((parseConfigFile('export default {}') as { error: string }).error, /not valid JSON/);
});

test('a repeated key is refused at any depth, and only a key counts', () => {
  assert.match((parseConfigFile('{"name":"a","name":"b"}') as { error: string }).error, /"name" more than once/);
  assert.match(
    (parseConfigFile('{"modules":{"canvas":true,"canvas":false}}') as { error: string }).error,
    /"canvas" more than once/,
  );
  assert.ok('value' in parseConfigFile('{"a":{"x":1},"b":{"x":2},"list":[{"x":1},{"x":2}],"name":"x:","t":"name"}'));
});

test('serializing is 2-space JSON with a trailing newline and keeps key order', () => {
  const text = serializeConfig(base);
  assert.ok(text.endsWith('}\n') && !text.endsWith('\n\n'));
  assert.match(text, /^\{\n {2}"\$schema": /);
  assert.deepEqual(Object.keys(JSON.parse(text)), Object.keys(base));
  assert.equal(serializeConfig((parseConfigFile(text) as { value: StudioConfig }).value), text);
});

test('changing a setting keeps its place, and a new setting goes where readers expect it', () => {
  const renamed = withSettings(base, { name: 'Renamed' });
  assert.deepEqual(Object.keys(renamed), Object.keys(base));
  assert.equal(renamed.name, 'Renamed');
  assert.equal(base.name, 'Studio', 'the original is untouched');
  const withTagline = withSettings(base, { tagline: 'Hello' });
  assert.deepEqual(Object.keys(withTagline), [
    '$schema',
    'name',
    'usage',
    'tagline',
    'modules',
    'systems',
    'systemMaintainers',
    'defaultSystem',
  ]);
  const withAdmins = withSettings(withTagline, { admins: ['bbbbbbbbbbbbbbbb'] });
  assert.equal(Object.keys(withAdmins).at(-1), 'admins');
  assert.deepEqual(
    Object.keys(withSettings(withAdmins, { tagline: undefined })),
    Object.keys(withAdmins).filter(k => k !== 'tagline'),
  );
  // Reordered by hand: nothing moves.
  const custom = { name: 'A', defaultSystem: 'x', usage: 'team' } as Partial<StudioConfig>;
  assert.deepEqual(Object.keys(withSettings(custom, { usage: 'personal', tagline: 'T' })), [
    'name',
    'defaultSystem',
    'usage',
    'tagline',
  ]);
});

test('turning a module on, off, or out edits only the modules list', () => {
  assert.deepEqual(withModule(base, 'text', true).modules, { canvas: true, text: true });
  assert.deepEqual(withModule(base, 'diagrams', false).modules, { canvas: true, text: false, diagrams: false });
  assert.deepEqual(withModule(base, 'text', null).modules, { canvas: true });
  assert.deepEqual(Object.keys(withModule(base, 'text', null)), Object.keys(base));
  assert.deepEqual(withModule({ ...base, modules: undefined } as unknown as StudioConfig, 'text', true).modules, {
    text: true,
  });
});
