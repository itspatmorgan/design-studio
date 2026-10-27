import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import build from './build.ts';

test('published controls require an explicit valid per-view opt-in', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dialkit-published-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const folder = path.join(root, 'src/prototypes/sample/demo');
  fs.mkdirSync(folder, { recursive: true });
  for (const [id, declaration] of [
    ['public', '// @dialkit {"version":1,"published":true}'],
    ['local', '// @dialkit {"version":1}'],
    ['off', '// @dialkit {"version":1,"published":false}'],
    ['invalid', '// @dialkit {"version":1,"published":"true"}'],
  ]) {
    fs.writeFileSync(path.join(folder, `${id}.tsx`), `/** @studio-id ${id} */\n${declaration}\nimport {useBespokeControls} from '@module/dialkit';\nexport default null;`);
  }
  const { data } = await build.manifest({ root } as never);
  assert.deepEqual(data.public, { attached: true, connected: true, published: true });
  for (const id of ['local', 'off', 'invalid']) assert.equal(data[id].published, false);
});
