import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prototype');
const root = path.resolve(fixture, '../../..');
const contributor = execFileSync(process.execPath, ['src/platform/node/cli/resolve-contributor.js'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[a-z0-9-]+$/.test(contributor)) throw new Error('Resolve a registered contributor before creating this experiment.');
const folder = `src/prototypes/${contributor}/dialkit-booking-lab`;
if (fs.existsSync(path.join(root, folder))) {
  console.log(`Preserved existing prototype at ${folder}.`);
  process.exit(0);
}
const run = (...args) => execFileSync('pnpm', args, { cwd: root, encoding: 'utf8' });
console.log(run('new', 'DialKit Booking Lab', '--no-system'));
const initial = path.join(root, folder, 'prototype.tsx');
const identity = fs.readFileSync(initial, 'utf8').split('\n')[0];
fs.renameSync(initial, path.join(root, folder, 'main.tsx'));
for (const name of ['main.tsx', 'about.tsx', '_booking.module.css']) {
  fs.writeFileSync(path.join(root, folder, name), (name === 'main.tsx' ? identity + '\n' : '') + fs.readFileSync(path.join(fixture, name), 'utf8'));
}
const metaPath = path.join(root, folder, 'meta.json');
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
meta.order = ['main.tsx', 'about.tsx'];
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
run('studio', 'identify', folder, '--json'); // Preview before applying missing identities.
console.log(run('studio', 'identify', folder, '--yes'));
console.log(`Created ${folder}. Open /prototypes/${meta.studioId}.`);
