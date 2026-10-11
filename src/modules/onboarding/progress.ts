// Browser completion provides a fallback for unavailable local persistence.
const completed = new Set<string>();
const claims = new Map<string, Promise<boolean>>();
type StorageSource = () => Pick<Storage, 'getItem' | 'setItem'>;
export function progressKey(base: string, contributor: string | null = null) {
  return `design-studio:onboarding:${base}:${contributor ?? 'unregistered'}:v3`;
}

export function isComplete(key: string, storage: StorageSource = () => localStorage) {
  if (completed.has(key)) return true;
  try {
    return storage().getItem(key) === 'complete';
  } catch {
    return false;
  }
}

export function complete(key: string, storage: StorageSource = () => localStorage) {
  completed.add(key);
  try {
    storage().setItem(key, 'complete');
    return true;
  } catch {
    return false;
  }
}

// Share the initial request across StrictMode effect replay. Disk state survives origins and restarts.
export function claimIntroduction(key: string) {
  let claim = claims.get(key);
  if (!claim) {
    claim = fetch('/__studio/onboarding/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim' }),
    })
      .then(async response => {
        // Invalid declarations must be corrected, never interpreted as first-use defaults.
        if (response.status === 422) return false;
        if (!response.ok) throw new Error('Welcome state unavailable');
        const result = (await response.json()) as { show: boolean | null };
        return typeof result.show === 'boolean' ? result.show : !isComplete(key);
      })
      .catch(() => !isComplete(key));
    claims.set(key, claim);
  }
  return claim;
}

export function recordIntroduction(key: string) {
  claims.set(key, Promise.resolve(false));
  complete(key);
}
