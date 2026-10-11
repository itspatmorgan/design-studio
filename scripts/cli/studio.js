// Identity recovery must work before strict runtime configuration can load.
const command = process.argv[2];
if (['identity-audit', 'identity-plan', 'identity-apply', 'identify'].includes(command))
  await import('./studio-identity.js');
else await import('./studio-runtime.js');
