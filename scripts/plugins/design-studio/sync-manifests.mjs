import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = new URL('../../../plugins/design-studio/', import.meta.url);
export function manifestOutputs(portable) {
  const { $schema, extensions, ...identity } = portable;
  const { interface: ui, ...openai } = extensions['com.openai'];
  const marketplace = {
    name: identity.name,
    owner: identity.author,
    metadata: { description: 'Design Studio beta setup for local coding agents.' },
    plugins: [{ name: identity.name, source: './plugins/design-studio', description: identity.description }],
  };
  return new Map([
    [
      '.codex-plugin/plugin.json',
      { ...identity, skills: './skills/', interface: ui, extensions: { 'com.openai': openai } },
    ],
    ['.claude-plugin/plugin.json', { ...identity, skills: './skills/' }],
    ['.cursor-plugin/plugin.json', { ...identity, skills: './skills/', logo: './assets/logo.svg' }],
    ['../../.claude-plugin/marketplace.json', marketplace],
    ['../../.cursor-plugin/marketplace.json', marketplace],
    [
      '../../.agents/plugins/marketplace.json',
      {
        name: marketplace.name,
        interface: { displayName: ui.displayName },
        plugins: [
          {
            name: identity.name,
            source: { source: 'local', path: marketplace.plugins[0].source },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: ui.category,
          },
        ],
      },
    ],
  ]);
}

export function syncManifests(check = false) {
  const portable = JSON.parse(fs.readFileSync(new URL('plugin.json', root), 'utf8'));
  for (const [relative, value] of manifestOutputs(portable)) {
    const file = fileURLToPath(new URL(relative, root));
    const content = JSON.stringify(value, null, 2) + '\n';
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content)
        throw new Error(`Generated manifest is stale: ${file}`);
    } else if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  syncManifests(process.argv.includes('--check'));
