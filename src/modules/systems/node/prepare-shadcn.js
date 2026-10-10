// Prepare upstream generation outside Studio. This command never imports into a system.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readDeclaration } from '../../../platform/core/declarations.ts';

export function prepareShadcn(root, system, { preset = 'nova', base = 'base', components = [] } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(system ?? '')) throw new Error('Provide the source key of an active prototype system.');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(preset)) throw new Error('Use a preset code or name. Extract the preset code from a builder link first.');
  if (!['base', 'radix'].includes(base)) throw new Error('Use base or radix as the component base.');
  if (!Array.isArray(components) || components.some(name => !/^[a-z][a-z0-9-]*$/.test(name))) throw new Error('Select built-in shadcn components by name.');
  const declaration = readDeclaration(fs.readFileSync(path.join(root, 'src/systems', system, 'system.ts'), 'utf8'));
  if ('error' in declaration || declaration.value.role !== 'prototype' || declaration.value.status !== 'active') throw new Error('Staging requires an active prototype system.');
  const studio = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const upstream = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/shadcn/package.json'), 'utf8'));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `studio-${system}-shadcn-`));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(workspace, file)), { recursive: true });
    fs.writeFileSync(path.join(workspace, file), content);
  };
  const dependencies = Object.fromEntries(['react', 'react-dom', 'tailwindcss'].map(name => [name, studio.dependencies[name] ?? studio.devDependencies[name]]));
  const devDependencies = Object.fromEntries(['vite', '@vitejs/plugin-react', '@tailwindcss/vite', 'typescript', '@types/react', '@types/react-dom', '@types/node'].map(name => [name, studio.devDependencies[name]]));
  write('package.json', JSON.stringify({ name: 'studio-curation-stage', private: true, type: 'module', scripts: { dev: 'vite', build: 'vite build' }, dependencies, devDependencies }, null, 2) + '\n');
  write('index.html', '<!doctype html><html><head><title>System staging</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
  write('src/main.tsx', "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<div>System staging</div>);\n");
  write('src/index.css', '@import "tailwindcss";\n');
  write('vite.config.ts', "import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } });\n");
  write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', paths: { '@/*': ['./src/*'] }, noEmit: true }, include: ['src'] }, null, 2) + '\n');
  const commands = [
    ['pnpm', '--dir', workspace, 'install'],
    ['pnpm', 'exec', 'shadcn', 'init', '--cwd', workspace, '--preset', preset, '--base', base, '--yes', '--no-monorepo'],
    ...(components.length ? [ ['pnpm', 'exec', 'shadcn', 'add', '--cwd', workspace, ...components, '--dry-run'], ['pnpm', 'exec', 'shadcn', 'add', '--cwd', workspace, ...components, '--yes'] ] : []),
  ];
  const plan = { target: { sourceKey: system, studioId: declaration.value.studioId, directory: `src/systems/${system}` }, source: { library: 'shadcn/ui', cliVersion: upstream.version, preset, base, components }, workspace, commands, adaptations: ['Scope theme CSS and declare required tokens explicitly.', 'Review all package dependencies, helper files, fonts, and icons.', 'Rewrite imports into the target system and contain portals.', 'Document components and verify examples, modes, and a representative prototype.'] };
  write('curation-plan.json', JSON.stringify(plan, null, 2) + '\n');
  write('README.md', '# Upstream staging\n\nThis workspace is temporary source material, not an installed Studio system. Run the commands from the Studio checkout, review the generated files, then integrate selected material deliberately. Preserve the plan and actual resolved versions in the target system’s curation record before removing this workspace.\n');
  return plan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ options: { preset: { type: 'string' }, base: { type: 'string' }, components: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' } }, allowPositionals: true });
    if (values.help) console.log('Usage: pnpm prepare-shadcn <system-key> [--preset <code-or-name>] [--base base|radix] [--components button,input] [--json]\nPrepares an isolated Vite workspace and commands. Does not install or import material.');
    else {
      if (positionals.length !== 1) throw new Error('Provide one system source key. Use --help for usage.');
      const root = fileURLToPath(new URL('../../../../', import.meta.url));
      const plan = prepareShadcn(root, positionals[0], { preset: values.preset, base: values.base, components: values.components ? values.components.split(',') : [] });
      const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
      console.log(values.json ? JSON.stringify(plan, null, 2) : `Prepared ${plan.workspace}\nTarget: ${plan.target.directory}\nRun from the Studio checkout:\n${plan.commands.map(args => args.map(quote).join(' ')).join('\n')}\nReview curation-plan.json before integration. Studio files have not been changed.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
