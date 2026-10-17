// Prepare an isolated upstream workspace. Integration into Studio is reviewed repository work.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readDeclaration } from '../../../core/declarations.ts';
import { systemDirOf } from '../../../node/lib/system-folders.js';

export function prepareShadcn(root, system, { preset, base, components = [], designMd } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(system ?? '')) throw new Error('Provide an active system source key.');
  const target = path.join(root, systemDirOf(root, system));
  const spec = readDeclaration(fs.readFileSync(path.join(target, 'system.ts'), 'utf8'));
  if (
    'error' in spec ||
    !['prototype', 'platform'].includes(spec.value.role) ||
    spec.value.status !== 'active' ||
    !/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(spec.value.studioId ?? '')
  )
    throw new Error('An active system with a permanent identity is required.');
  if (preset?.startsWith('https://ui.shadcn.com/create?')) preset = new URL(preset).searchParams.get('preset') ?? '';
  if (preset !== undefined && !/^[a-zA-Z0-9_-]{1,80}$/.test(preset))
    throw new Error('Use a preset code or builder link.');
  if (components.some(name => !/^[a-z][a-z0-9-]*$/.test(name))) throw new Error('Select components by name.');
  const configFile = path.join(target, 'components.json');
  const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : null;
  const savedBase = config?.style?.split('-')[0];
  base ??= savedBase ?? 'base';
  if (!['base', 'radix'].includes(base)) throw new Error('Use base or radix.');
  const reuse = config && preset === undefined && base === savedBase;
  const design = designMd ? fs.readFileSync(path.resolve(root, designMd)) : null;
  const host = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `studio-${system}-shadcn-`));
  const write = (file, value) => {
    fs.mkdirSync(path.dirname(path.join(workspace, file)), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, file),
      typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n',
    );
  };
  const versions = names =>
    Object.fromEntries(names.map(name => [name, host.dependencies[name] ?? host.devDependencies[name]]));
  write('package.json', {
    name: 'studio-curation-stage',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: versions(['react', 'react-dom', 'tailwindcss', 'cn']),
    devDependencies: versions([
      'vite',
      '@vitejs/plugin-react',
      '@tailwindcss/vite',
      'typescript',
      '@types/react',
      '@types/react-dom',
      '@types/node',
    ]),
  });
  write(
    'index.html',
    '<!doctype html><html><head><title>System staging</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  );
  write(
    'src/main.tsx',
    "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<div>System staging</div>);\n",
  );
  write(
    'src/index.css',
    '@import "tailwindcss";\n' +
      (reuse && fs.existsSync(path.join(target, 'styles/theme.css'))
        ? fs.readFileSync(path.join(target, 'styles/theme.css'), 'utf8')
        : ''),
  );
  write('src/utils.ts', 'export { cn } from "cn";\n');
  write(
    'vite.config.ts',
    "import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } });\n",
  );
  write('tsconfig.json', {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      paths: { '@/*': ['./src/*'] },
      noEmit: true,
    },
    include: ['src'],
  });
  if (reuse)
    write('components.json', {
      ...config,
      tailwind: { ...config.tailwind, config: '', css: 'src/index.css' },
      aliases: { components: '@/components', ui: '@/components/ui', utils: '@/utils', lib: '@/lib', hooks: '@/hooks' },
    });
  if (design) write('DESIGN.md', design);
  const shadcn = (...args) => ['pnpm', 'exec', 'shadcn', ...args, '--cwd', workspace];
  return {
    workspace,
    commands: [
      ['pnpm', '--dir', workspace, 'install'],
      ...(!reuse
        ? [
            shadcn(
              'init',
              '--preset',
              preset ?? config?.style?.slice(savedBase.length + 1) ?? 'nova',
              '--base',
              base,
              '--yes',
              '--no-monorepo',
            ),
          ]
        : []),
      shadcn('info', '--json'),
      shadcn('preset', 'resolve', '--json'),
      ...(components.length
        ? [
            shadcn('docs', ...components, '--json'),
            shadcn('add', ...components, '--dry-run'),
            shadcn('add', ...components, '--yes'),
          ]
        : []),
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      options: {
        preset: { type: 'string' },
        base: { type: 'string' },
        components: { type: 'string' },
        'design-md': { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
      allowPositionals: true,
    });
    if (values.help)
      console.log(
        'Usage: pnpm prepare-shadcn <system-key> [--preset <code-or-builder-link>] [--base base|radix] [--components button,input] [--design-md <file>] [--json]\nPrepares an isolated Vite workspace. Run printed commands from the Studio checkout; integrate selected files manually.',
      );
    else {
      if (positionals.length !== 1) throw new Error('Provide one system source key.');
      const result = prepareShadcn(fileURLToPath(new URL('../../../../../', import.meta.url)), positionals[0], {
        preset: values.preset,
        base: values.base,
        components: values.components?.split(','),
        designMd: values['design-md'],
      });
      const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
      console.log(
        values.json
          ? JSON.stringify(result, null, 2)
          : `Prepared ${result.workspace}\nRun from the Studio checkout:\n${result.commands.map(args => args.map(quote).join(' ')).join('\n')}\nReview and integrate selected source; Studio files have not changed.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
