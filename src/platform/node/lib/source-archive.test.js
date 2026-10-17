import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { archiveEntries, extractArchive, boundedDownload } from './source-archive.js';

function tar(name, type = '0', data = Buffer.from('hello')) {
  const header = Buffer.alloc(512);
  header.write(name);
  header.write('0000644\0', 100);
  header.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
  header.fill(32, 148, 156);
  header.write(type, 156);
  header.write('ustar\0', 257);
  const sum = header.reduce((a, b) => a + b, 0);
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return gzipSync(Buffer.concat([header, data, Buffer.alloc((512 - (data.length % 512)) % 512), Buffer.alloc(1024)]));
}

test('archives are validated before extraction and reject traversal, links, truncation and oversized entries', () => {
  assert.equal(archiveEntries(tar('pack/module.ts'))[0].data.toString(), 'hello');
  for (const name of ['../escape', '/escape', 'pack/../../escape'])
    assert.throws(() => archiveEntries(tar(name)), /path/);
  for (const type of ['1', '2', 'S']) assert.throws(() => archiveEntries(tar('link', type)), /regular files/);
  assert.throws(() => archiveEntries(tar('large', '0', Buffer.alloc(2 * 1024 * 1024 + 1))), /larger/);
  assert.throws(() => archiveEntries(gzipSync(Buffer.alloc(100))), /truncated/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-archive-'));
  try {
    const invalid = gzipSync(
      Buffer.concat([gunzipSync(tar('safe.txt')).subarray(0, -1024), gunzipSync(tar('../escape'))]),
    );
    assert.throws(() => extractArchive(invalid, dir));
    assert.deepEqual(fs.readdirSync(dir), []);
    extractArchive(tar('pack/module.ts'), dir);
    assert.equal(fs.readFileSync(path.join(dir, 'pack/module.ts'), 'utf8'), 'hello');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download enforces its limit while streaming', async () => {
  assert.equal((await boundedDownload(new Response('hello'), 5)).toString(), 'hello');
  await assert.rejects(boundedDownload(new Response('hello!'), 5), /larger/);
  const body = (async function* () {
    yield Buffer.from('abc');
    yield Buffer.from('def');
    throw new Error('Read past limit');
  })();
  await assert.rejects(boundedDownload({ body }, 5), /larger/);
});
