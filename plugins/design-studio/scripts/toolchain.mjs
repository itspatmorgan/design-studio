import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Probe executables, not just their presence: Apple's Git can exist but fail.
export function findWorkingGit({ env = process.env, platform = process.platform, probe = spawnSync } = {}) {
  const filename = platform === 'win32' ? 'git.exe' : 'git';
  const candidates = [
    ...(env.PATH ?? '')
      .split(path.delimiter)
      .filter(Boolean)
      .map(dir => path.resolve(dir, filename)),
    ...(platform === 'darwin' ? ['/opt/homebrew/bin/git', '/usr/local/bin/git'] : []),
  ];
  const failures = [];
  for (const executable of new Set(candidates)) {
    if (!fs.existsSync(executable)) continue;
    const result = probe(executable, ['--version'], {
      env,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (!result.error && result.status === 0 && /^git version /m.test(result.stdout ?? ''))
      return fs.realpathSync(executable);
    failures.push(executable + ': ' + (result.error?.message ?? result.stderr?.trim() ?? 'failed'));
  }
  throw new Error('No working Git executable. Install or repair Git through supported tools. ' + failures.join('; '));
}

export function gitEnvironment(git, env = process.env) {
  // Set this BEFORE mise exec; mise then puts pinned Node/pnpm ahead of it.
  return { ...env, PATH: path.dirname(git) + path.delimiter + (env.PATH ?? ''), GIT_TERMINAL_PROMPT: '0' };
}

export function verifyPinnedTools(destination, env) {
  const result = spawnSync(
    'mise',
    [
      'exec',
      '--',
      'node',
      '--input-type=module',
      '-e',
      'import {execFileSync} from "node:child_process"; console.log(JSON.stringify({node:process.execPath,nodeVersion:process.versions.node,gitVersion:execFileSync("git",["--version"],{encoding:"utf8"}).trim()}));',
    ],
    { cwd: destination, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.error || result.status !== 0)
    throw new Error('Pinned tool verification failed: ' + (result.error?.message ?? result.stderr?.trim()));
  const tools = JSON.parse(result.stdout.trim());
  if (Number(tools.nodeVersion.split('.')[0]) !== 24)
    throw new Error('Studio requires pinned Node 24; selected ' + tools.nodeVersion + '. Check mise configuration.');
  return tools;
}

const LOCAL_CONFIG =
  '# Design Studio: verified local Git (machine-only).\n[env]\n_.path = { path = ["{{config_root}}/.git/design-studio-tools"], tools = true }\n';
export function configureLocalGit(destination, git) {
  if (process.platform === 'win32') return false; // Windows native journey remains unverified.
  const config = path.join(destination, 'mise.local.toml');
  if (
    fs.existsSync(config) &&
    (fs.lstatSync(config).isSymbolicLink() || fs.readFileSync(config, 'utf8') !== LOCAL_CONFIG)
  )
    return false;
  const directory = path.join(destination, '.git/design-studio-tools');
  if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink())
    throw new Error('Local Git tools directory must not be a symlink.');
  fs.mkdirSync(directory, { recursive: true });
  const link = path.join(directory, 'git');
  try {
    const stat = fs.lstatSync(link);
    if (!stat.isSymbolicLink()) throw new Error('Existing local Git tool was preserved; inspect it before retrying.');
    if (fs.readlinkSync(link) !== git) {
      if (!fs.existsSync(config)) throw new Error('Existing local Git tool was preserved; inspect it before retrying.');
      // Only the shim owned by our exact generated local config may be refreshed.
      fs.unlinkSync(link);
      fs.symlinkSync(git, link);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.symlinkSync(git, link);
  }
  const exclude = path.join(destination, '.git/info/exclude');
  fs.mkdirSync(path.dirname(exclude), { recursive: true });
  const previous = fs.existsSync(exclude) ? fs.readFileSync(exclude, 'utf8') : '';
  if (!previous.split('\n').includes('/mise.local.toml')) fs.appendFileSync(exclude, '\n/mise.local.toml\n');
  if (!fs.existsSync(config)) fs.writeFileSync(config, LOCAL_CONFIG, { flag: 'wx' });
  return true;
}
