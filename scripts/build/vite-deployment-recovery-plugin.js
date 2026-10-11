// Installed before the entry module: an old HTML response can reference an asset
// removed by a new deployment, so recovery cannot depend on that module loading.
export function installDeploymentRecovery(win, base) {
  const parameter = '_studio_reload';
  const key = `studio:deployment-recovery:${base}`;
  const cooldown = 60_000;
  let recovering = false;
  function recover() {
    if (recovering || win.navigator.onLine === false) return false;
    const url = new URL(win.location.href);
    const now = Date.now();
    let previous = Number(url.searchParams.get(parameter)) || 0;
    try {
      previous = Math.max(previous, Number(win.sessionStorage.getItem(key)) || 0);
    } catch {
      /* Storage may be unavailable. The URL still bounds retries. */
    }
    if (previous && now - previous < cooldown) return false;
    recovering = true;
    try {
      win.sessionStorage.setItem(key, String(now));
    } catch {
      /* URL fallback below. */
    }
    url.searchParams.set(parameter, String(now));
    win.location.replace(url.href);
    return true;
  }
  win.addEventListener('vite:preloadError', event => {
    if (recover()) event.preventDefault();
  });
  win.addEventListener(
    'error',
    event => {
      const script = event.target;
      if (script?.tagName !== 'SCRIPT' || script.type !== 'module' || !script.src) return;
      const asset = new URL(script.src, win.location.href);
      const site = new URL(base, win.location.origin);
      if (asset.origin !== site.origin || !asset.pathname.startsWith(`${site.pathname}assets/`)) return;
      if (!recover()) {
        const root = win.document.getElementById('root');
        if (root && !root.hasChildNodes())
          root.textContent =
            'This viewing site could not load. Check your connection and refresh the page to try again.';
      }
    },
    true,
  );
}

export default function deploymentRecovery() {
  let base;
  return {
    name: 'studio-deployment-recovery',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'script',
            children: `(${installDeploymentRecovery.toString()})(window,${JSON.stringify(base)});`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}
