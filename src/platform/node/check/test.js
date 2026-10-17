// Discover tests directly; removing an optional module removes its tests too.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { MODULE_ROOTS } from '../../core/roots.ts';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--release')) throw new Error('Usage: test.js [--release]');
const patterns = ['src/platform', ...MODULE_ROOTS].flatMap(root => [`${root}/**/*.test.ts`, `${root}/**/*.test.js`]);
const files = [...new Set(fs.globSync(patterns))]
  .filter(file => args.includes('--release') || !file.endsWith('.integration.test.js'))
  .sort();
if (!files.length) throw new Error('No retained regression tests found.');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
