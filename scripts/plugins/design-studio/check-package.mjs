import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This inventory is the installed package, not the source-repository contents.
const FILES = [
  'plugin.json',
  'README.md',
  '.codex-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'assets/logo.svg',
  'assets/logo-dark.svg',
  'assets/composer-icon.svg',
  'assets/composer-icon-dark.svg',
  'skills/create-studio/SKILL.md',
  'skills/open-studio/SKILL.md',
  'skills/use-studio/SKILL.md',
  'skills/publish-studio/SKILL.md',
  'skills/create-studio/references/local-setup.md',
  'skills/create-studio/references/host-handoff.md',
  'scripts/bootstrap.mjs',
  'scripts/setup-environment.mjs',
  'scripts/toolchain.mjs',
  'scripts/starter-package.mjs',
  'scripts/starter-readme.md',
];
const packageRoot = fileURLToPath(new URL('../../../plugins/design-studio/', import.meta.url));

export function checkPackage(root = packageRoot) {
  root = fs.realpathSync(root);
  const expected = new Set(FILES);
  const directories = new Set(
    FILES.flatMap(file => {
      const parts = file.split('/');
      return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
    }),
  );
  const found = new Set();
  function walk(folder = '') {
    for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
      const file = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Plugin links are not allowed: ${file}`);
      if (entry.isDirectory()) {
        if (!directories.has(file)) throw new Error(`Unexpected plugin directory: ${file}`);
        walk(file);
      } else {
        if (!entry.isFile() || !expected.has(file)) throw new Error(`Unexpected plugin file: ${file}`);
        found.add(file);
      }
    }
  }
  walk();
  for (const file of expected) if (!found.has(file)) throw new Error(`Missing plugin file: ${file}`);

  function reference(file, value, from = path.dirname(path.join(root, file))) {
    const target = value.split('#')[0];
    if (!target) return;
    const resolved = path.resolve(from, target);
    if (resolved !== root && !resolved.startsWith(root + path.sep))
      throw new Error(`Plugin reference escapes package: ${file} -> ${value}`);
    if (!fs.existsSync(resolved)) throw new Error(`Missing plugin reference: ${file} -> ${value}`);
  }
  for (const file of found) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file.endsWith('.mjs')) {
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
        if (match[1].startsWith('node:')) continue;
        if (!match[1].startsWith('.'))
          throw new Error(`Plugin requires an external runtime module: ${file} -> ${match[1]}`);
        reference(file, match[1]);
      }
      for (const match of source.matchAll(/new URL\(['"]([^'"]+)['"],\s*import\.meta\.url\)/g))
        reference(file, match[1]);
    }
    // This template is written as the created Studio's README; its links target that Studio.
    if (file.endsWith('.md') && file !== 'scripts/starter-readme.md') {
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        if (/^[a-z][a-z\d+.-]*:/i.test(match[1])) continue;
        reference(file, match[1]);
      }
    }
    if (file.endsWith('.json')) {
      function visit(value) {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value)) {
          if (
            ['skills', 'logo', 'logoDark', 'composerIcon', 'composerIconDark', 'onboardingSkill'].includes(key) &&
            typeof child === 'string'
          )
            reference(file, child, root);
          else visit(child);
        }
      }
      visit(JSON.parse(source));
    }
  }
  return { files: found.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkPackage();
  console.log(
    `Plugin package verified: ${result.files} delivery files, runtime and skill references resolve inside the package.`,
  );
}
