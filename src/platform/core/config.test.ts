import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  adminProblems,
  CONFIG_FILE,
  CONFIG_KEYS,
  configProblems,
  isEnabled,
  studioRole,
  systemRegistered,
  TAGLINE_MAX,
  USAGES,
  type StudioConfig,
} from './config.ts';

const modules = [
  { id: 'contributors', optional: true },
  { id: 'documentation', optional: true },
  { id: 'prototypes', optional: false },
];
const config: StudioConfig = {
  formatVersion: 1,
  name: 'Studio',
  usage: 'team',
  admins: ['sam'],
  modules: { contributors: true, documentation: true, prototypes: true },
  systems: ['product'],
  systemMaintainers: { product: [] },
  defaultSystem: 'product',
};
const problems = (changes: Record<string, unknown>) =>
  configProblems({ ...config, ...changes }, modules, ['product']).join('\n');

test('an explicit configuration is complete', () => {
  assert.deepEqual(configProblems(config, modules, ['product']), []);
  assert.deepEqual(
    configProblems({ ...config, usage: 'personal', modules: { ...config.modules, documentation: false } }, modules, [
      'product',
    ]),
    [],
  );
});

test('identity and optional tagline are validated', () => {
  assert.match(problems({ name: ' ' }), /add a name/);
  assert.match(problems({ usage: undefined }), /usage should/);
  assert.match(problems({ usage: 'other' }), /usage should/);
  assert.match(problems({ tagline: 'x'.repeat(141) }), /tagline/);
  assert.match(problems({ tagline: 42 }), /tagline/);
  assert.deepEqual(configProblems({ ...config, tagline: 'Our work' }, modules, ['product']), []);
  assert.match(configProblems(undefined, modules)[0], /must be a JSON object/);
  assert.match(configProblems([], modules)[0], /must be a JSON object/);
  assert.match(
    configProblems({ ...config, theme: 'dark' }, modules, ['product']).join(' '),
    /"theme" is not a setting/,
  );
  assert.match(problems({ $schema: 42 }), /\$schema should be/);
  assert.deepEqual(configProblems({ ...config, $schema: './schema.json' }, modules, ['product']), []);
});

test('Onboarding needs no studio-wide progress declaration', () => {
  const installed = [...modules, { id: 'onboarding', optional: true }];
  const enabled = { ...config, modules: { ...config.modules, onboarding: true } };
  assert.deepEqual(configProblems(enabled, installed, ['product']), []);
  assert.match(
    configProblems({ ...enabled, welcomeDismissed: true } as StudioConfig, installed, ['product']).join(' '),
    /"welcomeDismissed" is not a setting/,
  );
  assert.deepEqual(
    configProblems({ ...enabled, modules: { ...enabled.modules, onboarding: false } }, installed, ['product']),
    [],
  );
});

test('every installed module needs an explicit boolean', () => {
  assert.match(problems({ modules: undefined }), /declare every installed module/);
  assert.match(problems({ modules: { prototypes: true } }), /declare modules.documentation/);
  assert.match(problems({ modules: { ...config.modules, nope: true } }), /no module has that id/);
  assert.match(problems({ modules: { ...config.modules, documentation: 'yes' } }), /true or false/);
  assert.match(problems({ modules: [] }), /should list module ids/);
  assert.match(problems({ modules: { ...config.modules, prototypes: false } }), /can't be turned off/);
});

test('omission never activates a module', () => {
  assert.equal(isEnabled({}, 'documentation'), false);
  assert.equal(isEnabled({ modules: {} }, 'documentation'), false);
  assert.equal(isEnabled(config, 'documentation'), true);
  assert.equal(isEnabled({ modules: { documentation: false } }, 'documentation'), false);
});

test('systems and default system are registered explicitly', () => {
  assert.match(problems({ systems: undefined }), /systems must list/);
  assert.match(problems({ systems: 'product' }), /systems must list/);
  assert.match(problems({ systems: [] }), /register installed system "product"/);
  assert.match(problems({ systems: ['product', 'brand'] }), /"brand", but it is not installed/);
  assert.match(problems({ systems: ['product', 'product'] }), /unique/);
  assert.match(problems({ systems: ['product', 7] }), /unique/);
  assert.match(problems({ defaultSystem: undefined }), /declare defaultSystem/);
  assert.match(problems({ defaultSystem: 'studio' }), /no system has that id/);
  assert.match(problems({ defaultSystem: 'brand' }), /no system has that id/);
});

test('the platform system is always available and listing it is an error', () => {
  // Not listing it is the whole of its registration.
  assert.deepEqual(configProblems(config, modules, ['product']), []);
  const listed = configProblems({ ...config, systems: ['studio', 'product'] }, modules, ['product']);
  assert.equal(listed.length, 1);
  assert.match(
    listed[0],
    /^studio\.config\.json: systems lists "studio", the platform system\. It is always available/,
  );
  assert.match(
    configProblems({ ...config, systems: ['studio', 'product'] }, modules).join(' '),
    /systems lists "studio", the platform system/,
  );
  assert.match(problems({ systemMaintainers: { studio: [], product: [] } }), /registered prototype system/);
});

test('the platform system is registered by its role, not by its name or by systems', () => {
  assert.equal(systemRegistered(config, 'studio', 'platform'), true);
  assert.equal(systemRegistered({ systems: [] }, 'anything', 'platform'), true);
  assert.equal(systemRegistered({}, 'anything', 'platform'), true);
  assert.equal(systemRegistered(config, 'product', 'prototype'), true);
  assert.equal(systemRegistered(config, 'brand', 'prototype'), false);
  assert.equal(systemRegistered({}, 'product', 'prototype'), false);
});

test('required application registration follows the resolved platform role id', () => {
  const custom = { ...config, systems: ['product'] };
  assert.deepEqual(configProblems(custom, modules, ['product'], 'custom-studio'), []);
  assert.match(
    configProblems({ ...custom, systems: ['custom-studio', 'product'] }, modules, ['product'], 'custom-studio').join(
      ' ',
    ),
    /systems lists "custom-studio", the platform system/,
  );
  // With another platform id, "studio" is just a system that is not installed.
  assert.match(
    configProblems({ ...custom, systems: ['studio', 'product'] }, modules, ['product'], 'custom-studio').join(' '),
    /"studio", but it is not installed/,
  );
  assert.match(
    configProblems({ ...custom, defaultSystem: 'custom-studio' }, modules, ['product'], 'custom-studio').join(' '),
    /no system has that id/,
  );
});

test('team Admin assignments require unique registered contributors', () => {
  for (const admins of [undefined, [], ['sam', 'sam'], ['Invalid'], 'sam', [42]])
    assert.ok(adminProblems({ usage: 'team', admins } as Partial<StudioConfig>).length);
  assert.deepEqual(adminProblems({ usage: 'team', admins: ['sam', 'alex'] }, ['sam', 'alex']), []);
  assert.match(
    adminProblems({ usage: 'team', admins: ['missing'] }, ['sam']).join(' '),
    /not a registered contributor/,
  );
  assert.deepEqual(adminProblems({ usage: 'personal' }, ['sam']), []);
});

test('local roles derive personal Admin access and never recognize unregistered identities', () => {
  assert.equal(studioRole(config, 'sam', ['sam', 'alex']), 'admin');
  assert.equal(studioRole(config, 'alex', ['sam', 'alex']), 'contributor');
  assert.equal(studioRole(config, 'sam', []), null);
  assert.equal(studioRole(config, null, ['sam']), null);
  assert.equal(studioRole({ usage: 'personal' }, 'alex', ['alex']), 'admin');
});

test('system maintainer grants must be explicit, registered, and separate from Studio', () => {
  assert.match(problems({ systemMaintainers: undefined }), /declare systemMaintainers/);
  assert.match(problems({ systemMaintainers: {} }), /product/);
  assert.match(problems({ systemMaintainers: { studio: [], product: [] } }), /registered prototype system/);
  assert.match(problems({ systemMaintainers: { product: ['sam', 'sam'] } }), /unique/);
  assert.match(
    configProblems({ ...config, systemMaintainers: { product: ['missing'] } }, modules, ['product'], 'studio', [
      'sam',
    ]).join(' '),
    /not a registered contributor/,
  );
});

test('team management is required in team use and removable in personal use', () => {
  assert.match(problems({ modules: { ...config.modules, contributors: false } }), /team use requires/);
  const { contributors, ...personalModules } = config.modules;
  const without = modules.filter(module => module.id !== 'contributors');
  assert.deepEqual(
    configProblems({ ...config, usage: 'personal', modules: personalModules }, without, ['product']),
    [],
  );
  assert.match(
    configProblems({ ...config, modules: personalModules }, without, ['product']).join(' '),
    /team use requires/,
  );
});

// The JSON Schema (src/platform/core/studio.config.schema.json) is for editors; configProblems is the source of truth.
// These tests keep them from drifting: the same settings, required list, enums and limits, and the same verdict on
// the configs below. Only the parts of the schema this file uses are understood by the small checker.
type Schema = Record<string, any>;
const schema: Schema = JSON.parse(fs.readFileSync(new URL('./studio.config.schema.json', import.meta.url), 'utf8'));

function schemaProblems(value: unknown, node: Schema, at = '$'): string[] {
  const out: string[] = [];
  const fail = (what: string) => out.push(`${at}: ${what}`);
  if (node.const !== undefined && value !== node.const) fail('const');
  if (node.enum && !node.enum.includes(value)) fail('enum');
  if (node.type) {
    const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (kind !== node.type) return [...out, `${at}: type ${kind}, wanted ${node.type}`];
  }
  if (typeof value === 'string') {
    if (node.minLength !== undefined && value.length < node.minLength) fail('minLength');
    if (node.maxLength !== undefined && value.length > node.maxLength) fail('maxLength');
    if (node.pattern && !new RegExp(node.pattern).test(value)) fail('pattern');
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) fail('minItems');
    if (node.uniqueItems && new Set(value).size !== value.length) fail('uniqueItems');
    if (node.items) value.forEach((item, i) => out.push(...schemaProblems(item, node.items, `${at}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const key of node.required ?? []) if (!Object.hasOwn(object, key)) fail(`missing ${key}`);
    for (const [key, entry] of Object.entries(object)) {
      if (node.properties?.[key]) out.push(...schemaProblems(entry, node.properties[key], `${at}.${key}`));
      else if (node.additionalProperties === false) fail(`unknown ${key}`);
      else if (node.additionalProperties) out.push(...schemaProblems(entry, node.additionalProperties, `${at}.${key}`));
    }
  }
  if (node.if && !schemaProblems(value, node.if, at).length && node.then)
    out.push(...schemaProblems(value, node.then, at));
  return out;
}

const team: StudioConfig = { ...config, usage: 'team' };
const personal: StudioConfig = { ...config, usage: 'personal', admins: undefined };
delete personal.admins;

test('the schema names exactly the settings the validator and the type accept', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(Object.keys(schema.properties), [...CONFIG_KEYS]);
  assert.equal(schema.additionalProperties, false);
  for (const [key, property] of Object.entries<Schema>(schema.properties))
    assert.ok(String(property.description ?? '').length > 40, `${key} needs a description that carries the guidance`);
  // The validator refuses any other setting, as the schema does.
  assert.match(problems({ other: 1 }), /"other" is not a setting/);
  // Every key is listed by CONFIG_KEYS in the type's own terms (the compile-time guard is in config.ts).
  const everything: Record<keyof StudioConfig, true> = {
    $schema: true,
    formatVersion: true,
    name: true,
    usage: true,
    admins: true,
    systemMaintainers: true,
    tagline: true,
    modules: true,
    systems: true,
    defaultSystem: true,
  };
  assert.deepEqual([...CONFIG_KEYS].sort(), Object.keys(everything).sort());
});

test('the schema requires what the validator requires', () => {
  // A setting is required exactly when leaving it out is a problem. Admins are required only in team use.
  const required = (base: StudioConfig, key: string) => {
    const { [key as keyof StudioConfig]: _omitted, ...rest } = base as Record<string, unknown>;
    return configProblems(rest, modules, ['product']).length > 0;
  };
  const validatorRequired = CONFIG_KEYS.filter(key => required(personal, key));
  assert.deepEqual([...validatorRequired].sort(), [...schema.required].sort());
  assert.deepEqual(
    CONFIG_KEYS.filter(key => required(team, key) && !validatorRequired.includes(key)),
    ['admins'],
  );
  assert.deepEqual(schema.if, { properties: { usage: { const: 'team' } }, required: ['usage'] });
  assert.deepEqual(schema.then.required, ['admins']);
  assert.equal(schema.then.properties.admins.minItems, 1);
  assert.match(configProblems({ ...team, admins: [] }, modules, ['product']).join(' '), /at least one Admin/);
});

test('the schema has the validator’s enums and limits', () => {
  assert.deepEqual(schema.properties.usage.enum, [...USAGES]);
  for (const usage of USAGES) assert.deepEqual(configProblems({ ...team, usage }, modules, ['product']), []);
  assert.match(problems({ usage: 'solo' }), /usage should/);
  assert.equal(schema.properties.tagline.maxLength, TAGLINE_MAX);
  assert.equal(TAGLINE_MAX, 140);
  assert.deepEqual(configProblems({ ...config, tagline: 'x'.repeat(TAGLINE_MAX) }, modules, ['product']), []);
  assert.match(problems({ tagline: 'x'.repeat(TAGLINE_MAX + 1) }), /tagline/);
  assert.match(problems({ admins: ['Not A Key'] }), /admins must list/);
  assert.equal(new RegExp(schema.properties.admins.items.pattern).test('Not A Key'), false);
  assert.equal(schema.properties.modules.additionalProperties.type, 'boolean');
  assert.match(problems({ modules: { ...config.modules, documentation: 'yes' } }), /true or false/);
});

test('the schema and the validator agree on the same configurations', () => {
  const without = (base: StudioConfig, key: string) => {
    const { [key as keyof StudioConfig]: _omitted, ...rest } = base as Record<string, unknown>;
    return rest;
  };
  const cases: [string, unknown, boolean][] = [
    ['a complete team config', team, true],
    ['a complete personal config', personal, true],
    ['with $schema', { ...personal, $schema: './x.json' }, true],
    ['with a tagline', { ...personal, tagline: 'Our work' }, true],
    ['an unknown setting', { ...personal, theme: 'dark' }, false],
    ['no name', without(personal, 'name'), false],
    ['a blank name', { ...personal, name: ' ' }, false],
    ['a non-text name', { ...personal, name: 3 }, false],
    ['an unknown usage', { ...personal, usage: 'solo' }, false],
    ['team without admins', without(team, 'admins'), false],
    ['team with empty admins', { ...team, admins: [] }, false],
    ['personal with empty admins', { ...personal, admins: [] }, true],
    ['repeated admins', { ...team, admins: ['sam', 'sam'] }, false],
    ['a bad admin key', { ...team, admins: ['Sam'] }, false],
    ['a long tagline', { ...personal, tagline: 'x'.repeat(141) }, false],
    ['a module state that is not boolean', { ...personal, modules: { documentation: 1 } }, false],
    ['modules as a list', { ...personal, modules: [] }, false],
    ['repeated systems', { ...personal, systems: ['product', 'product'] }, false],
    ['a non-text system', { ...personal, systems: [1] }, false],
    ['no systems list', without(personal, 'systems'), false],
    ['no systemMaintainers', without(personal, 'systemMaintainers'), false],
    ['repeated maintainers', { ...personal, systemMaintainers: { product: ['sam', 'sam'] } }, false],
    ['no defaultSystem', without(personal, 'defaultSystem'), false],
    ['an empty defaultSystem', { ...personal, defaultSystem: '' }, false],
  ];
  for (const [what, value, valid] of cases) {
    assert.equal(configProblems(value, modules, ['product']).length === 0, valid, `validator: ${what}`);
    assert.equal(schemaProblems(value, schema).length === 0, valid, `schema: ${what} ${schemaProblems(value, schema)}`);
  }
});

test(`the checked-in ${CONFIG_FILE} satisfies its schema and declares it`, () => {
  const seed = JSON.parse(fs.readFileSync(new URL(`../../../${CONFIG_FILE}`, import.meta.url), 'utf8'));
  assert.equal(seed.$schema, './src/platform/core/studio.config.schema.json');
  assert.deepEqual(schemaProblems(seed, schema), []);
  assert.ok(!seed.systems.includes('studio'), 'the platform system is never listed');
  assert.deepEqual(
    Object.keys(seed).filter(key => !(CONFIG_KEYS as readonly string[]).includes(key)),
    [],
  );
});

test('a missing or unknown formatVersion is a problem that names the file', () => {
  const { formatVersion: _omitted, ...unstamped } = config;
  assert.match(
    configProblems(unstamped, modules, ['product']).join('\n'),
    /studio\.config\.json: add "formatVersion": 1/,
  );
  assert.match(problems({ formatVersion: 2 }), /studio\.config\.json: formatVersion is 2.*newer studio/);
  assert.match(problems({ formatVersion: '1' }), /studio\.config\.json: formatVersion is "1"/);
  assert.equal(problems({ formatVersion: 1 }), '');
});
