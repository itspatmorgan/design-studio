// Identity inspection and scoped assignment run without loading the runtime manifest.
const command = process.argv[2];
if (['identity-audit', 'identify'].includes(command)) await import('./studio-identity.js');
// Updating must work whatever state the studio's settings are in, so it does not load the runtime.
else if (command === 'update') await import('./studio-update.js');
else await import('./studio-runtime.js');
