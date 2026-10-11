import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeProfiles } from './fixtures/contributors.js';
import { readDeclaration } from '../../core/declarations.ts';
import { editStudioConfig } from './studio-setup.js';
import { inspectBuild } from '../check/inspect-build.js';

const temporary = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-boundaries-')));
const write = (root, file, code) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, code);
  return target;
};

test('private module consumers and symlink scopes are rejected; disabled app and file-type code is absent from the production bundle', () => {
  const root = temporary();
  const original = path.resolve('.');
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
    linkSystemDependencies(original, root);
    writeProfiles(root, { 'boundary-fixture': { name: 'Boundary Fixture', email: 'boundary@example.test' } });
    const configFile = path.join(root, 'studio.config.ts');
    fs.writeFileSync(
      configFile,
      editStudioConfig(fs.readFileSync(configFile, 'utf8'), {
        usage: 'personal',
        admins: [JSON.parse(fs.readFileSync(path.join(root, 'contributors/boundary-fixture.json'))).studioId],
      }),
    );
    const env = {
      ...process.env,
      STUDIO_BASE_PATH: '/release-fixture/',
      MISE_TRUSTED_CONFIG_PATHS: root,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.name',
      GIT_CONFIG_VALUE_0: 'Boundary Fixture',
      GIT_CONFIG_KEY_1: 'user.email',
      GIT_CONFIG_VALUE_1: 'boundary@example.test',
    };
    const run = (file, ...args) =>
      execFileSync(process.execPath, [file, ...args], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000,
        env,
      });
    const attempt = (file, ...args) =>
      spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8', env });
    // A team module can't reuse a supplied module's id: checks and builds stop and say which folders clash.
    write(
      root,
      'src/modules/canvas/module.ts',
      "export default {id:'canvas',label:'Canvas again',version:'0.1.0',optional:true,lib:false};",
    );
    const reused = attempt('src/platform/node/check/check-modules.js');
    assert.equal(reused.status, 1, reused.stdout + reused.stderr);
    assert.match(reused.stderr, /canvas: found in src\/platform\/modules\/canvas\/ and src\/modules\/canvas\//);
    const reusedBuild = attempt('node_modules/vite/bin/vite.js', 'build');
    assert.notEqual(reusedBuild.status, 0);
    assert.match(reusedBuild.stdout + reusedBuild.stderr, /canvas: found in src\/platform\/modules\/canvas\//);
    fs.rmSync(path.join(root, 'src/modules/canvas'), { recursive: true });
    write(
      root,
      'src/modules/extra/module.ts',
      "export default {id:'extra',label:'Extra',version:'0.1.0',optional:true,lib:true};",
    );
    write(root, 'src/modules/extra/lib/index.ts', 'export const value = 1;');
    write(root, 'src/modules/extra/lib/private.ts', 'export const hidden = 1;');
    for (const entry of ['app.tsx', 'open.tsx'])
      write(
        root,
        `src/modules/extra/${entry}`,
        'Object.assign(globalThis, { __BOUNDARY_DISABLED_SENTINEL__: true }); export default {};',
      );
    write(
      root,
      'src/modules/extra/type.ts',
      "Object.assign(globalThis, { __BOUNDARY_DISABLED_SENTINEL__: true }); export default {label:'Extra',extensions:[],inPrototype:false,inSystemContent:false,fallback:false,capabilities:{source:false,create:false,fidelity:false,embeds:[],actions:[]}};",
    );
    const consumer = write(
      root,
      'src/lib/private-consumer.ts',
      "export {hidden} from '/modules/extra/lib/private.ts';",
    );
    assert.equal(attempt('src/platform/node/check/check-modules.js').status, 1);
    fs.writeFileSync(consumer, "export {value} from '@module/extra';");
    const removal = attempt('src/platform/node/cli/studio.js', 'remove', 'extra');
    assert.equal(removal.status, 1, removal.stdout + removal.stderr);
    assert.match(removal.stdout + removal.stderr, /private-consumer/);
    fs.rmSync(consumer);
    run('src/platform/node/cli/studio.js', 'disable', 'extra');
    run(
      '--input-type=module',
      '--eval',
      `
      import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
      import {prototypeDir,resolveInside} from './src/platform/node/build/files/paths.js';
      import {canChange} from './src/platform/node/build/files/policy.js';
      const base='src/prototypes'; fs.mkdirSync(base+'/scope-alex/other',{recursive:true}); fs.mkdirSync(base+'/scope-sam');
      fs.writeFileSync(base+'/scope-alex/other/meta.json','{"title":"Other"}'); fs.writeFileSync(base+'/scope-alex/other/notes.md','# Other');
      fs.symlinkSync(path.resolve(base+'/scope-alex/other'),base+'/scope-sam/linked');
      const linked=path.resolve(base+'/scope-sam/linked');
      assert.equal(prototypeDir('scope-sam','linked'),null); assert.equal(resolveInside(linked,'notes.md'),null); assert.equal(canChange('scope-sam','scope-sam',linked),false);
      fs.mkdirSync(base+'/scope-sam/metadata'); fs.symlinkSync(path.resolve(base+'/scope-alex/missing.json'),base+'/scope-sam/metadata/meta.json');
      assert.equal(prototypeDir('scope-sam','metadata'),null); assert.equal(canChange('scope-sam','scope-sam',path.resolve(base+'/scope-sam/metadata')),false);
      fs.rmSync(base+'/scope-sam',{recursive:true,force:true}); fs.rmSync(base+'/scope-alex',{recursive:true,force:true});
    `,
    );
    run('src/platform/node/cli/studio.js', 'create-system', 'boundary-system', '--yes');
    write(
      root,
      'src/systems/boundary-system/components/proof.tsx',
      'export function Proof() { return <button>__CUSTOM_SYSTEM_PROOF__</button>; }',
    );
    write(
      root,
      'src/prototypes/boundary-fixture/production/meta.json',
      JSON.stringify({
        title: 'Production fixture',
        systemId: readDeclaration(fs.readFileSync(path.join(root, 'src/systems/boundary-system/system.ts'), 'utf8'))
          .value.studioId,
      }),
    );
    write(
      root,
      'src/prototypes/boundary-fixture/production/main.tsx',
      "import { Proof } from '@/systems/boundary-system/components/proof'; import {usePrototypeArtifactHref} from '@module/prototypes'; export default function View() { const artifactHref=usePrototypeArtifactHref(); const href=artifactHref('main.tsx'); return <a href={href}><Proof /></a>; }",
    );
    write(root, 'src/lib/build-only.test.ts', "export const fixtureClass = 'w-[123456px]';");
    run('src/platform/node/cli/studio.js', 'identify', 'src/prototypes/boundary-fixture/production', '--yes');
    run('src/platform/node/build/build-manifest.js', '--strict', '--deploy');
    write(
      root,
      'src/systems/boundary-system/styles/imported.css',
      '.boundary-system-theme .scope-import-proof {color:red}',
    );
    const theme = path.join(root, 'src/systems/boundary-system/styles/theme.css');
    fs.writeFileSync(theme, '@import "./imported.css";\n' + fs.readFileSync(theme, 'utf8'));
    run('src/platform/node/check/typecheck.js');
    run('node_modules/vite/bin/vite.js', 'build');
    const output = [...fs.readdirSync(path.join(root, 'dist/assets'))]
      .filter(f => f.endsWith('.js'))
      .map(f => fs.readFileSync(path.join(root, 'dist/assets', f), 'utf8'))
      .join('');
    assert.equal(output.includes('__BOUNDARY_DISABLED_SENTINEL__'), false);
    assert.equal(output.includes('__CUSTOM_SYSTEM_PROOF__'), true);
    const css = fs
      .readdirSync(path.join(root, 'dist/assets'))
      .filter(f => f.endsWith('.css'))
      .map(f => fs.readFileSync(path.join(root, 'dist/assets', f), 'utf8'))
      .join('');
    assert.match(css, /scope-import-proof/);
    assert.equal(css.includes('123456px'), false, 'test-only utilities must not ship');
    const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
    assert.equal(fs.readFileSync(path.join(root, 'dist/404.html'), 'utf8'), html);
    assert.ok(html.includes('/release-fixture/assets/'));
    assert.ok(html.indexOf('studio:deployment-recovery') < html.indexOf('type="module"'));
    assert.ok(inspectBuild(path.join(root, 'dist')).requests > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
