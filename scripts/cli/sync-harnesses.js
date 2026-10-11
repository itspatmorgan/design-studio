// One entry point for generated harness files; installed studios have no plugin package.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: pnpm harness:sync [--check]');
const check = args.includes('--check');
const plugin = new URL('../plugins/design-studio/sync-manifests.mjs', import.meta.url);
if (fs.existsSync(plugin)) {
  const { syncManifests } = await import(plugin.href);
  syncManifests(check);
  const { checkPackage } = await import(new URL('../plugins/design-studio/check-package.mjs', import.meta.url).href);
  checkPackage();
}
execFileSync(process.execPath, ['scripts/cli/studio.js', 'sync', ...(check ? ['--check'] : [])], {
  cwd: root,
  stdio: 'inherit',
});
