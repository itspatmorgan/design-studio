// Batch a burst of file notifications and serialize refreshes. A notification received while
// loading schedules one trailing refresh, so the latest edit is never lost.
export function createRefreshQueue(refresh: () => Promise<unknown>, schedule: (callback: () => void) => void) {
  let scheduled = false;
  let running = false;
  let dirty = false;
  const flush = async () => {
    scheduled = false;
    if (running || !dirty) return;
    dirty = false;
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
      if (dirty) request();
    }
  };
  const request = () => {
    dirty = true;
    if (scheduled || running) return;
    scheduled = true;
    schedule(() => {
      void flush();
    });
  };
  return request;
}
