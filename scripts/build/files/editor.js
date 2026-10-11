import fs from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { canonicalDirectory } from '../../lib/safe-paths.js';

const execute = promisify(execFile);
const launchApplication = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
const EDITORS = [
  { name: 'Cursor', command: 'cursor', app: 'Cursor.app' },
  { name: 'Visual Studio Code', command: 'code', app: 'Visual Studio Code.app' },
  { name: 'VSCodium', command: 'codium', app: 'VSCodium.app' },
  { name: 'Zed', command: 'zed', app: 'Zed.app' },
  { name: 'Sublime Text', command: 'subl', app: 'Sublime Text.app' },
];

// Only source files/folders, never hidden files, traversal, or symbolic links.
export function editorFile(root, relative) {
  if (
    typeof relative !== 'string' ||
    !relative.startsWith('src/') ||
    relative.includes('\0') ||
    relative.includes('\\') ||
    relative.split('/').some(p => !p || p.startsWith('.'))
  )
    return null;
  const file = path.join(root, relative);
  if (!canonicalDirectory(path.dirname(file), root)) return null;
  try {
    const stat = fs.lstatSync(file);
    return !stat.isSymbolicLink() && (stat.isFile() || stat.isDirectory()) ? file : null;
  } catch {
    return null;
  }
}

export function installedEditors({
  platform = process.platform,
  home = homedir(),
  exists = fs.existsSync,
  env = process.env,
} = {}) {
  const preferred = EDITORS.find(e => [e.command, e.name].includes(env.LAUNCH_EDITOR));
  const editors = preferred ? [preferred, ...EDITORS.filter(e => e !== preferred)] : EDITORS;
  return editors.flatMap(editor => {
    if (platform === 'darwin') {
      const app = ['/Applications', path.join(home, 'Applications')]
        .map(folder => path.join(folder, editor.app))
        .find(exists);
      if (app) return [{ name: editor.name, command: '/usr/bin/open', args: ['-a', app] }];
    }
    // Windows launcher scripts need a shell; use installed applications there instead.
    if (platform === 'win32') {
      const roots = [env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'), env.ProgramFiles].filter(Boolean);
      const app = roots
        .map(folder =>
          path.join(
            folder,
            editor.name === 'Visual Studio Code' ? 'Microsoft VS Code' : editor.name,
            `${editor.name === 'Visual Studio Code' ? 'Code' : editor.name}.exe`,
          ),
        )
        .find(exists);
      return app ? [{ name: editor.name, command: app, args: [], detached: true }] : [];
    }
    const command = (env.PATH ?? '')
      .split(path.delimiter)
      .map(folder => path.join(folder, editor.command))
      .find(candidate => {
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return fs.statSync(candidate).isFile();
        } catch {
          return false;
        }
      });
    return command ? [{ name: editor.name, command, args: [] }] : [];
  });
}

export async function openEditor(
  file,
  { editors = installedEditors(), run = execute, launch = launchApplication, reveal } = {},
) {
  for (const editor of editors) {
    try {
      if (editor.detached) await launch(editor.command, [...editor.args, file]);
      else await run(editor.command, [...editor.args, file], { timeout: 5000, maxBuffer: 64 * 1024 });
      return { opened: true, editor: editor.name };
    } catch {
      /* Try the next installed editor before falling back. */
    }
  }
  await reveal(file);
  return {
    opened: false,
    message: editors.length
      ? "Couldn't open your editor. The file is shown in Finder; you can also use Edit source in Studio."
      : 'No supported editor is installed. The file is shown in Finder; you can also use Edit source in Studio.',
  };
}
