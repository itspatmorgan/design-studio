// A saved file is not proof that the runtime has applied it. Wait for a new ready instance.
export async function waitForRestart(
  runtimeId: string,
  {
    signal,
    request = async () => {
      const response = await fetch('/__studio/settings', {
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]),
      });
      if (!response.ok) throw new Error('Studio is not ready.');
      return response.json();
    },
    pause = () => new Promise<void>(resolve => setTimeout(resolve, 500)),
    attempts = 30,
  }: {
    signal: AbortSignal;
    request?: () => Promise<{ runtimeId: string; restarting: boolean }>;
    pause?: () => Promise<void>;
    attempts?: number;
  },
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    await pause();
    signal.throwIfAborted();
    try {
      const ready = await request();
      signal.throwIfAborted();
      if (typeof ready.runtimeId === 'string' && ready.runtimeId !== runtimeId && !ready.restarting) return;
    } catch (error) {
      if (signal.aborted) throw error;
      // Disconnections and incomplete responses are expected while the server restarts.
    }
  }
  throw new Error(
    'Your settings were saved, but the studio has not finished restarting. Reload settings to check again.',
  );
}
