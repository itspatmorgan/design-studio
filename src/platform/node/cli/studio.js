// Identity inspection and scoped assignment run without loading the runtime manifest.
const command = process.argv[2];
if (['identity-audit', 'identify'].includes(command)) await import('./studio-identity.js');
else if (command === 'preferences') await import('./studio-preferences.js');
else await import('./studio-runtime.js');
