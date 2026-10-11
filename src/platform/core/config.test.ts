import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminProblems, configProblems, isEnabled, studioRole, type StudioConfig } from './config.ts';

const modules = [
  { id: 'contributors', optional: true },
  { id: 'documentation', optional: true },
  { id: 'prototypes', optional: false },
];
const config: StudioConfig = {
  name: 'Studio',
  usage: 'team',
  admins: ['sam'],
  modules: { contributors: true, documentation: true, prototypes: true },
  systems: ['studio', 'product'],
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
  assert.match(configProblems(undefined, modules)[0], /must export/);
});

test('Onboarding needs no studio-wide progress declaration', () => {
  const installed = [...modules, { id: 'onboarding', optional: true }];
  const enabled = { ...config, modules: { ...config.modules, onboarding: true } };
  assert.deepEqual(configProblems(enabled, installed, ['product']), []);
  const legacy: StudioConfig = { ...enabled, welcomeDismissed: true };
  assert.deepEqual(configProblems(legacy, installed, ['product']), []);
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
  assert.match(problems({ systems: undefined }), /explicitly list/);
  assert.match(problems({ systems: ['product'] }), /must include studio/);
  assert.match(problems({ systems: ['studio'] }), /register installed system "product"/);
  assert.match(problems({ systems: ['studio', 'product', 'brand'] }), /not installed/);
  assert.match(problems({ systems: ['studio', 'product', 'product'] }), /unique/);
  assert.match(problems({ defaultSystem: undefined }), /declare defaultSystem/);
  assert.match(problems({ defaultSystem: 'studio' }), /no system has that id/);
  assert.match(problems({ defaultSystem: 'brand' }), /no system has that id/);
});

test('required application registration follows the resolved platform role id', () => {
  const custom = { ...config, systems: ['custom-studio', 'product'] };
  assert.deepEqual(configProblems(custom, modules, ['product'], 'custom-studio'), []);
  assert.match(
    configProblems({ ...custom, systems: ['product'] }, modules, ['product'], 'custom-studio').join(' '),
    /must include custom-studio/,
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
