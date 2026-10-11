// Prepare upstream generation outside Studio. This command never imports into a system.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { readDeclaration } from '../../../platform/core/declarations.ts';
import { systemDirOf } from '../../../platform/node/lib/system-folders.js';

function targetSystem(root, system) {
  if (!/^[a-z][a-z0-9-]*$/.test(system ?? '')) throw new Error('Provide the source key of an active system.');
  const declaration = readDeclaration(fs.readFileSync(path.join(root, systemDirOf(root, system), 'system.ts'), 'utf8'));
  if (
    'error' in declaration ||
    !['prototype', 'platform'].includes(declaration.value.role) ||
    declaration.value.status !== 'active' ||
    !/^[a-z0-9]{16}$/.test(declaration.value.studioId ?? '')
  )
    throw new Error('Staging requires an active system with a permanent identity.');
  return declaration.value;
}

function checkConfig(config) {
  if (
    !config ||
    typeof config !== 'object' ||
    !/^(base|radix)-[a-z0-9-]+$/.test(config.style ?? '') ||
    !config.tailwind ||
    !config.aliases ||
    typeof config.iconLibrary !== 'string'
  )
    throw new Error(
      'Expected a resolved shadcn configuration with a base/radix style, Tailwind settings, aliases, and icon library.',
    );
  return config;
}

// The aliases point at the system's folder wherever it was found (src/platform/systems/studio, src/systems/product).
function systemConfig(root, system, config) {
  const alias = `@/${systemDirOf(root, system).replace(/^src\//, '')}`;
  return {
    ...config,
    rsc: false,
    tsx: true,
    tailwind: { ...config.tailwind, config: '', css: 'styles/theme.css', prefix: '' },
    aliases: {
      components: `${alias}/components`,
      ui: `${alias}/components`,
      utils: '@/lib/utils',
      lib: `${alias}/lib`,
      hooks: `${alias}/hooks`,
    },
  };
}

// Capture configuration only. Runtime integration and scoped theme adaptation remain reviewed work.
export function saveShadcnConfig(root, system, workspace) {
  const declaration = targetSystem(root, system);
  const plan = JSON.parse(fs.readFileSync(path.join(workspace, 'curation-plan.json'), 'utf8'));
  if (
    plan.target.sourceKey !== system ||
    plan.target.studioId !== declaration.studioId ||
    path.resolve(plan.workspace) !== path.resolve(workspace)
  )
    throw new Error('The staging plan does not belong to this system.');
  const destination = path.join(root, systemDirOf(root, system), 'components.json');
  const current = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8') : null;
  if (current !== plan.target.configBefore)
    throw new Error('System configuration changed since preparation. Prepare again before saving.');
  const config = systemConfig(
    root,
    system,
    checkConfig(JSON.parse(fs.readFileSync(path.join(workspace, 'components.json'), 'utf8'))),
  );
  fs.writeFileSync(destination, JSON.stringify(config, null, 2) + '\n');
  return destination;
}

export function prepareShadcn(root, system, { preset, base, components = [], designMd } = {}) {
  const declaration = targetSystem(root, system);
  const configFile = path.join(root, systemDirOf(root, system), 'components.json');
  const configBefore = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null;
  const config = configBefore ? checkConfig(JSON.parse(configBefore)) : null;
  const savedBase = config?.style.split('-')[0];
  base ??= savedBase ?? 'base';
  if (!['base', 'radix'].includes(base)) throw new Error('Use base or radix as the component base.');
  if (preset && !/^[a-zA-Z0-9_-]{1,80}$/.test(preset) && !/^https:\/\/ui\.shadcn\.com\/create\?[^\s]+$/.test(preset))
    throw new Error('Use a preset code, name, or HTTPS shadcn builder link.');
  if (!Array.isArray(components) || components.some(name => !/^[a-z][a-z0-9-]*$/.test(name)))
    throw new Error('Select built-in shadcn components by name.');
  const reuseConfig = Boolean(config && !preset && base === savedBase);
  if (!reuseConfig) preset ??= config?.style.slice(savedBase.length + 1) ?? 'nova';
  const presetCode = preset?.startsWith('https://') ? new URL(preset).searchParams.get('preset') : preset;
  if (preset && !/^[a-zA-Z0-9_-]{1,80}$/.test(presetCode ?? ''))
    throw new Error('The builder link must include a valid preset code.');
  const designSource = designMd ? path.resolve(root, designMd) : null;
  const designContent = designSource ? fs.readFileSync(designSource) : null;
  const studio = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const upstream = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/shadcn/package.json'), 'utf8'));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `studio-${system}-shadcn-`));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(workspace, file)), { recursive: true });
    fs.writeFileSync(path.join(workspace, file), content);
  };
  const dependencies = Object.fromEntries(
    ['react', 'react-dom', 'tailwindcss'].map(name => [
      name,
      studio.dependencies[name] ?? studio.devDependencies[name],
    ]),
  );
  const devDependencies = Object.fromEntries(
    [
      'vite',
      '@vitejs/plugin-react',
      '@tailwindcss/vite',
      'typescript',
      '@types/react',
      '@types/react-dom',
      '@types/node',
    ].map(name => [name, studio.devDependencies[name]]),
  );
  write(
    'package.json',
    JSON.stringify(
      {
        name: 'studio-curation-stage',
        private: true,
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies,
        devDependencies,
      },
      null,
      2,
    ) + '\n',
  );
  write(
    'index.html',
    '<!doctype html><html><head><title>System staging</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  );
  write(
    'src/main.tsx',
    "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<div>System staging</div>);\n",
  );
  write('src/index.css', '@import "tailwindcss";\n');
  if (reuseConfig) {
    write(
      'components.json',
      JSON.stringify(
        {
          ...config,
          tailwind: { ...config.tailwind, config: '', css: 'src/index.css' },
          aliases: {
            components: '@/components',
            ui: '@/components/ui',
            utils: '@/lib/utils',
            lib: '@/lib',
            hooks: '@/hooks',
          },
        },
        null,
        2,
      ) + '\n',
    );
    const theme = path.join(root, systemDirOf(root, system), 'styles/theme.css');
    if (fs.existsSync(theme)) write('src/index.css', '@import "tailwindcss";\n' + fs.readFileSync(theme, 'utf8'));
    write('src/lib/utils.ts', 'export { cn } from "cn";\n');
    dependencies.cn = studio.dependencies.cn;
    write(
      'package.json',
      JSON.stringify(
        {
          name: 'studio-curation-stage',
          private: true,
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies,
          devDependencies,
        },
        null,
        2,
      ) + '\n',
    );
  }
  if (designContent) write('DESIGN.md', designContent);
  write(
    'vite.config.ts',
    "import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } });\n",
  );
  write(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          paths: { '@/*': ['./src/*'] },
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',
  );
  const commands = [
    ['pnpm', '--dir', workspace, 'install'],
    ...(!reuseConfig
      ? [
          [
            'pnpm',
            'exec',
            'shadcn',
            'init',
            '--cwd',
            workspace,
            '--preset',
            presetCode,
            '--base',
            base,
            '--yes',
            '--no-monorepo',
          ],
        ]
      : []),
    ['pnpm', 'exec', 'shadcn', 'info', '--cwd', workspace, '--json'],
    ['pnpm', 'exec', 'shadcn', 'preset', 'resolve', '--cwd', workspace, '--json'],
    ...(components.length
      ? [
          ['pnpm', 'exec', 'shadcn', 'docs', '--cwd', workspace, ...components, '--json'],
          ['pnpm', 'exec', 'shadcn', 'add', '--cwd', workspace, ...components, '--dry-run'],
          ['pnpm', 'exec', 'shadcn', 'add', '--cwd', workspace, ...components, '--yes'],
        ]
      : []),
  ];
  const plan = {
    target: { sourceKey: system, studioId: declaration.studioId, directory: systemDirOf(root, system), configBefore },
    source: {
      library: 'shadcn/ui',
      cliVersion: upstream.version,
      preset: preset ?? null,
      base,
      components,
      configuration: reuseConfig ? 'system' : 'preset',
      designMd: designContent
        ? { path: designSource, sha256: createHash('sha256').update(designContent).digest('hex') }
        : null,
    },
    workspace,
    commands,
    saveConfigCommand: ['pnpm', 'prepare-shadcn', system, '--save-config', workspace],
    adaptations: [
      'Scope theme CSS and declare required tokens explicitly.',
      'Review all package dependencies, helper files, fonts, and icons.',
      'Rewrite imports into the target system and contain portals.',
      'Document components and verify examples, modes, and a representative prototype.',
    ],
  };
  write('curation-plan.json', JSON.stringify(plan, null, 2) + '\n');
  write(
    'README.md',
    '# Upstream staging\n\nThis workspace is temporary source material, not an installed Studio system. Run the commands from the Studio checkout, review the generated files, then integrate selected material deliberately. Existing runtime components are not copied: dry-run previews upstream staging writes, not diffs against adapted Studio components. A reused theme retains its system scope; this placeholder page is not a visual preview. Preserve the plan, resolved configuration and versions in the target system’s curation record before removing this workspace. After review, use saveConfigCommand to save configuration only.\n',
  );
  return plan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      options: {
        preset: { type: 'string' },
        base: { type: 'string' },
        components: { type: 'string' },
        'design-md': { type: 'string' },
        'save-config': { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
      allowPositionals: true,
    });
    if (values.help)
      console.log(
        'Usage: pnpm prepare-shadcn <system-key> [--preset <code-or-name-or-builder-link>] [--base base|radix] [--components button,input] [--design-md <local-file>] [--json]\nReuses system configuration unless a preset/base change is supplied. Prepares an isolated Vite workspace; does not install or import material.\nAfter review: pnpm prepare-shadcn <system-key> --save-config <workspace>\nSaves resolved configuration only, not generated code or theme.',
      );
    else {
      if (positionals.length !== 1) throw new Error('Provide one system source key. Use --help for usage.');
      const root = fileURLToPath(new URL('../../../../', import.meta.url));
      if (values['save-config']) {
        if (values.preset || values.base || values.components || values['design-md'])
          throw new Error('Save configuration separately from preparation options.');
        console.log(`Saved ${saveShadcnConfig(root, positionals[0], values['save-config'])}`);
      } else {
        const plan = prepareShadcn(root, positionals[0], {
          preset: values.preset,
          base: values.base,
          components: values.components ? values.components.split(',') : [],
          designMd: values['design-md'],
        });
        const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
        const shellCommand = args => args.map(quote).join(' ');
        console.log(
          values.json
            ? JSON.stringify(plan, null, 2)
            : `Prepared ${plan.workspace}\nTarget: ${plan.target.directory}\nRun from the Studio checkout:\n${plan.commands.map(shellCommand).join('\n')}\nAfter reviewing resolved configuration:\n${shellCommand(plan.saveConfigCommand)}\nReview curation-plan.json before integration. Studio files have not been changed.`,
        );
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
