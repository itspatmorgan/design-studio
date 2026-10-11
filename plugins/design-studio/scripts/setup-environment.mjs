import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Report only signal names, never environment values (which may contain secrets).
const SIGNALS = {
  SSH_CONNECTION: 'ssh',
  SSH_CLIENT: 'ssh',
  SSH_TTY: 'ssh',
  CODESPACES: 'codespaces',
  GITPOD_WORKSPACE_ID: 'gitpod',
  REMOTE_CONTAINERS: 'container',
  CODESPACE_NAME: 'codespaces',
  WSL_DISTRO_NAME: 'wsl',
  WSL_INTEROP: 'wsl',
};

export function suggestedParent(platform, home) {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  return paths.join(home, platform === 'darwin' ? 'Developer' : 'Projects');
}

function inspectHomeAccess(home, access) {
  try {
    access(home, fs.constants.W_OK | fs.constants.X_OK);
    return { writable: true };
  } catch (error) {
    return { writable: false, reason: error.code ?? 'unknown' };
  }
}

export function inspectEnvironment({
  env = process.env,
  platform = process.platform,
  architecture = process.arch,
  home = os.homedir(),
  hostname = os.hostname(),
  username = os.userInfo().username,
  exists = fs.existsSync,
  read = file => fs.readFileSync(file, 'utf8'),
  access = fs.accessSync,
} = {}) {
  const signals = Object.entries(SIGNALS)
    .filter(([key]) => env[key])
    .map(([, value]) => value);
  if (platform === 'linux') {
    if (exists('/.dockerenv') || exists('/run/.containerenv')) signals.push('container');
    try {
      const release = read('/proc/sys/kernel/osrelease');
      if (/microsoft/i.test(release)) signals.push('wsl');
    } catch {
      /* A missing proc filesystem is not proof of local execution. */
    }
  }
  const observations = { platform, architecture, home, hostname, username, signals: [...new Set(signals)].sort() };
  return {
    ...observations,
    filesystemLocation: 'requires user confirmation',
    homeAccess: inspectHomeAccess(home, access),
    suggestedParent: suggestedParent(platform, home),
  };
}

export function validateConfirmation(confirmation) {
  if (typeof confirmation !== 'string' || !confirmation.trim()) {
    throw new Error(
      'The user must confirm or modify the installation location after the environment audit. Record their response with --confirmation.',
    );
  }
}

export function environmentIdentity(environment) {
  return Object.fromEntries(
    ['platform', 'architecture', 'home', 'hostname', 'username', 'signals'].map(key => [key, environment[key]]),
  );
}

export function validateSetupPlan(plan, environment = inspectEnvironment()) {
  if (
    !plan ||
    plan.schema !== 1 ||
    plan.kind !== 'design-studio-setup' ||
    typeof plan.name !== 'string' ||
    !plan.name.trim() ||
    plan.name.length > 120 ||
    !path.isAbsolute(plan.destination ?? '')
  ) {
    throw new Error('A valid setup plan is required. Audit the environment, confirm the location, then run plan.');
  }
  validateConfirmation(plan.confirmation);
  if (
    JSON.stringify(environmentIdentity(plan.environment ?? {})) !== JSON.stringify(environmentIdentity(environment))
  ) {
    throw new Error(
      'The setup environment changed. Audit it again and ask the user to confirm or modify the destination before creating a new plan.',
    );
  }
  return plan;
}

export function readSetupPlan(file) {
  if (!file || !path.isAbsolute(file)) throw new Error('Provide --plan with an absolute setup-plan file path.');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('The setup plan must be an ordinary JSON file.');
  return validateSetupPlan(JSON.parse(fs.readFileSync(file, 'utf8')));
}
