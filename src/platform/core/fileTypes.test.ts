import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defineFileType,
  assertUniqueExtensions,
  artifactAvailability,
  type ArtifactAvailabilityContext,
  type FileTypeSpec,
} from './fileTypes.ts';
import {
  assertFileTypeModule,
  artifactActions,
  runArtifactAction,
  embedFor,
  type FileTypeModule,
  type ArtifactActionContext,
  type ArtifactActionTarget,
} from '../app/data/fileTypeModule.ts';

const fixture = (changes: Partial<FileTypeSpec> = {}): FileTypeSpec => ({
  label: 'Fixture',
  extensions: ['.fixture'],
  inPrototype: true,
  inSystemContent: false,
  fallback: false,
  capabilities: { source: true, create: false, fidelity: false, embeds: [], actions: [] },
  language: 'text',
  ...changes,
});
const environment: ArtifactAvailabilityContext = {
  local: true,
  editable: true,
  present: true,
  renderer: true,
  scope: 'prototype',
};
const module = (changes: Partial<FileTypeModule> = {}): FileTypeModule => ({
  icon: [] as unknown as FileTypeModule['icon'],
  load: async () => ({}),
  Page: () => null,
  ...changes,
});
const dispatch = (id: string, spec: FileTypeSpec, renderer: FileTypeModule, context: ArtifactActionContext) =>
  runArtifactAction(id, () => ({ spec, module: renderer, context }));
const actionContext = (changes: Partial<ArtifactAvailabilityContext> = {}): ArtifactActionContext => ({
  proto: {} as ArtifactActionContext['proto'],
  item: {} as ArtifactActionContext['item'],
  environment: { ...environment, ...changes },
});

test('capabilities require explicit declarations and reject drift and misspellings', () => {
  for (const key of ['source', 'create', 'fidelity', 'embeds', 'actions']) {
    const spec = fixture();
    delete (spec.capabilities as unknown as Record<string, unknown>)[key];
    assert.throws(() => defineFileType(spec), new RegExp(key));
  }
  assert.throws(
    () =>
      defineFileType(fixture({ capabilities: { ...fixture().capabilities, embdes: [] } } as unknown as FileTypeSpec)),
    /unknown capability embdes/,
  );
  assert.throws(() => defineFileType({ ...fixture(), preview: true } as FileTypeSpec), /replace preview/);
  for (const embeds of [['canvas', 'canvas'], ['unsupported']])
    assert.throws(
      () => defineFileType(fixture({ capabilities: { ...fixture().capabilities, embeds } } as unknown as FileTypeSpec)),
      /embeds/,
    );
  for (const actions of [['inspect'], ['fixture.inspect', 'fixture.inspect']])
    assert.throws(() => defineFileType(fixture({ capabilities: { ...fixture().capabilities, actions } })), /actions/);
  assert.throws(() => defineFileType(fixture({ language: undefined })), /language/);
  assert.throws(
    () => assertUniqueExtensions({ fixture: { ...fixture(), capabilities: undefined } as unknown as FileTypeSpec }),
    /declare capabilities/,
  );
  assert.throws(() => defineFileType(fixture({ template: () => '' })), /create/);
  assert.throws(
    () => defineFileType(fixture({ fidelity: { isLofi: () => false, setLofi: source => source } })),
    /fidelity/,
  );
});

test('source repair does not require a working renderer or write permission', () => {
  const state = artifactAvailability(fixture(), { ...environment, editable: false, renderer: false });
  assert.deepEqual(state.source, { supported: true, available: true });
  assert.equal(state.view.available, false);
  assert.equal(state.editSource.supported, true);
  assert.equal(state.editSource.available, false);
  assert.match(state.editSource.available ? '' : state.editSource.reason, /permission/);
});

test('availability separates unsupported, unavailable scope, missing files, and publication', () => {
  const spec = fixture();
  assert.equal(artifactAvailability(undefined, environment).source.supported, false);
  assert.equal(artifactAvailability(spec, environment).create.supported, false);
  for (const context of [{ local: false }, { present: false }, { scope: 'systemContent' as const }]) {
    const state = artifactAvailability(spec, { ...environment, ...context });
    assert.equal(state.source.supported, true);
    assert.equal(state.source.available, false);
  }
  const creates = fixture({ template: () => '', capabilities: { ...spec.capabilities, create: true } });
  assert.equal(
    artifactAvailability(creates, { ...environment, present: false }).create.available,
    true,
    'creation does not require an existing artifact',
  );
  assert.equal(artifactAvailability(creates, { ...environment, editable: false }).create.available, false);
});

test('Node-readable embed surfaces and browser implementations must agree', () => {
  const Embed = () => null;
  const spec = fixture({ capabilities: { ...fixture().capabilities, embeds: ['document'] } });
  assert.equal(embedFor(spec, module({ Embed }), 'document', 'prototype'), Embed);
  assert.equal(embedFor(spec, module({ Embed }), 'canvas', 'prototype'), undefined);
  assert.equal(embedFor(undefined, module({ Embed }), 'document', 'prototype'), undefined);
  assert.equal(
    embedFor(spec, module({ Embed }), 'document', 'systemContent'),
    undefined,
    'embed surfaces do not authorize a different content scope',
  );
  assert.throws(() => assertFileTypeModule('fixture', spec, module()), /Embed/);
  assert.throws(() => assertFileTypeModule('fixture', fixture(), module({ Embed })), /Embed/);
  assert.throws(() => assertFileTypeModule('fixture', spec, undefined), /Page and load/);
  assert.doesNotThrow(() => assertFileTypeModule('fixture', spec, module({ Embed })));
});

test('a module can contribute an action, explain refusal, and dispatch without shell changes', async () => {
  let runs = 0;
  let blocked = true;
  const spec = fixture({ capabilities: { ...fixture().capabilities, actions: ['fixture.inspect'] } });
  const renderer = module({
    actions: [
      {
        id: 'fixture.inspect',
        label: 'Inspect',
        localOnly: false,
        mutates: false,
        unavailable: () => (blocked ? 'Preview is not ready.' : null),
        run: () => {
          runs++;
        },
      },
    ],
  });
  assert.doesNotThrow(() => assertFileTypeModule('fixture', spec, renderer));
  const pending = artifactActions(spec, renderer, actionContext())[0].availability;
  assert.deepEqual(pending, { supported: true, available: false, reason: 'Preview is not ready.' });
  await assert.rejects(() => dispatch('fixture.inspect', spec, renderer, actionContext()), /not ready/);
  blocked = false;
  await dispatch('fixture.inspect', spec, renderer, actionContext({ local: false, editable: false }));
  assert.equal(runs, 1, 'nonmutating public actions do not acquire write permission');
  await assert.rejects(() => dispatch('fixture.inspect', fixture(), renderer, actionContext()), /unsupported/);
  assert.equal(runs, 1);
  assert.throws(() => assertFileTypeModule('fixture', fixture(), renderer), /must match/);
  assert.throws(
    () =>
      assertFileTypeModule(
        'fixture',
        spec,
        module({ actions: [{ ...renderer.actions![0], mutates: undefined } as never] }),
      ),
    /mutates/,
  );
  assert.throws(() => assertFileTypeModule('other', spec, renderer), /owner-prefixed/);
});

test('mutating actions cannot dispatch in published, read-only, missing, or wrong-scope contexts', async () => {
  let runs = 0;
  const spec = fixture({ capabilities: { ...fixture().capabilities, actions: ['fixture.change'] } });
  const renderer = module({
    actions: [
      {
        id: 'fixture.change',
        label: 'Change',
        localOnly: true,
        mutates: true,
        run: () => {
          runs++;
        },
      },
    ],
  });
  for (const context of [
    { local: false },
    { editable: false },
    { present: false },
    { renderer: false },
    { scope: 'systemContent' as const },
  ]) {
    await assert.rejects(() => dispatch('fixture.change', spec, renderer, actionContext(context)));
  }
  assert.equal(runs, 0);
  await dispatch('fixture.change', spec, renderer, actionContext());
  assert.equal(runs, 1);
});

test('malformed external action declarations give actionable validation', () => {
  const spec = fixture();
  for (const actions of [null, {}, [null], [{ id: 42 }], [{ id: 'fixture.inspect', label: 42 }]]) {
    assert.throws(
      () => assertFileTypeModule('fixture', spec, module({ actions } as unknown as FileTypeModule)),
      /File type fixture: actions/,
    );
  }
  for (const spec of [undefined, null, []])
    assert.throws(() => defineFileType(spec as unknown as FileTypeSpec), /declaration object/);
});

test('platform refusals skip module callbacks and callback failures remain unavailable', async () => {
  let checks = 0;
  let runs = 0;
  const spec = fixture({ capabilities: { ...fixture().capabilities, actions: ['fixture.inspect'] } });
  const renderer = module({
    actions: [
      {
        id: 'fixture.inspect',
        label: 'Inspect',
        localOnly: true,
        mutates: false,
        unavailable: () => {
          checks++;
          throw new Error('Missing preview');
        },
        run: () => {
          runs++;
        },
      },
    ],
  });
  const denied = artifactActions(spec, renderer, actionContext({ present: false }))[0];
  assert.equal(denied.availability.available, false);
  assert.equal(checks, 0);
  assert.equal(artifactActions(spec, renderer, actionContext())[0].availability.available, false);
  await assert.rejects(() => dispatch('fixture.inspect', spec, renderer, actionContext()), /availability callback/);
  assert.equal(runs, 0);
  const invalid = module({ actions: [{ ...renderer.actions![0], unavailable: () => undefined as never }] });
  assert.equal(artifactActions(spec, invalid, actionContext())[0].availability.available, false);
});

test('dispatch resolves current authority, artifact presence, and supported actions', async () => {
  let runs = 0;
  const spec = fixture({ capabilities: { ...fixture().capabilities, actions: ['fixture.change'] } });
  const renderer = module({
    actions: [
      {
        id: 'fixture.change',
        label: 'Change',
        localOnly: true,
        mutates: true,
        run: () => {
          runs++;
        },
      },
    ],
  });
  let current: ArtifactActionTarget | undefined = { spec, module: renderer, context: actionContext() };
  const resolve = () => current;
  assert.equal(artifactActions(spec, renderer, current.context)[0].availability.available, true);
  current = { ...current, context: actionContext({ editable: false }) };
  await assert.rejects(() => runArtifactAction('fixture.change', resolve), /permission/);
  current = undefined;
  await assert.rejects(() => runArtifactAction('fixture.change', resolve), /unavailable/);
  current = { spec: fixture(), module: renderer, context: actionContext() };
  await assert.rejects(() => runArtifactAction('fixture.change', resolve), /unsupported/);
  assert.equal(runs, 0);
});
