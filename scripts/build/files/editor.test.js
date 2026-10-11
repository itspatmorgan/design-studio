import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { editorFile, installedEditors, openEditor } from './editor.js';

test('editor targets reject traversal, hidden files, absolute paths and symlinks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-editor-'));
  try {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'file.tsx'), '');
    fs.symlinkSync(os.tmpdir(), path.join(root, 'src', 'linked'));
    assert.equal(editorFile(root, 'src/file.tsx'), path.join(root, 'src/file.tsx'));
    assert.equal(editorFile(root, 'src'), null);
    for (const value of [
      'src/../package.json',
      'src/.hidden',
      'src/linked/file',
      '/src/file.tsx',
      'src/./file.tsx',
      'src/file.tsx\0',
    ])
      assert.equal(editorFile(root, value), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('macOS editors are found without CLI setup and launch arguments remain literal', async () => {
  const editors = installedEditors({
    platform: 'darwin',
    home: '/home/test',
    env: { PATH: '', LAUNCH_EDITOR: 'code' },
    exists: candidate => ['/Applications/Cursor.app', '/Applications/Visual Studio Code.app'].includes(candidate),
  });
  assert.equal(editors[0].name, 'Visual Studio Code');
  const calls = [],
    file = '/studio/src/file $(echo secret).tsx';
  const result = await openEditor(file, {
    editors,
    run: async (...args) => calls.push(args),
    reveal: async () => assert.fail('Should open editor'),
  });
  assert.equal(result.opened, true);
  assert.deepEqual(calls[0][1], ['-a', '/Applications/Visual Studio Code.app', file]);
});

test('missing or failing editors reveal the file and explain fallback; Finder errors propagate', async () => {
  for (const editors of [[], [{ name: 'Cursor', command: '/cursor', args: [] }]]) {
    let revealed;
    const result = await openEditor('/file', {
      editors,
      run: async () => {
        throw new Error('failed');
      },
      reveal: async file => {
        revealed = file;
      },
    });
    assert.equal(revealed, '/file');
    assert.equal(result.opened, false);
    assert.match(result.message, /Edit source/);
  }
  await assert.rejects(
    openEditor('/file', {
      editors: [],
      reveal: async () => {
        throw new Error('Finder failed');
      },
    }),
    /Finder failed/,
  );
});

test('long-running Windows applications launch without a timeout that kills the editor', async () => {
  const editors = installedEditors({
    platform: 'win32',
    env: { LOCALAPPDATA: '/users/test', PATH: '' },
    exists: candidate => candidate.endsWith('/Programs/Cursor/Cursor.exe'),
  });
  assert.equal(editors[0].detached, true);
  let args;
  const result = await openEditor('/file.tsx', {
    editors,
    run: async () => assert.fail('Do not wait for GUI exit'),
    launch: async (...input) => {
      args = input;
    },
    reveal: async () => assert.fail('Should launch'),
  });
  assert.equal(result.opened, true);
  assert.deepEqual(args[1], ['/file.tsx']);
});
