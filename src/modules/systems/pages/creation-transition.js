// Dev-only, injected before the React entrypoint. The same status surface survives Vite's
// configuration restart, then the ready Overview or refreshed index releases it.
(() => {
  const key = 'studio:creating-system';
  let surface;
  let timer;
  function read() {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }
  function show() {
    const pending = read();
    if (!pending) return;
    if (Date.now() - pending.started > 120000) {
      sessionStorage.removeItem(key);
      return;
    }
    clearTimeout(timer);
    if (!surface) {
      surface = document.createElement('div');
      surface.id = 'studio-system-creation';
      surface.setAttribute('role', 'status');
      surface.setAttribute('aria-live', 'polite');
      surface.tabIndex = -1;
      surface.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:var(--creation-background,Canvas);color:var(--creation-foreground,CanvasText);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-style:normal;font-weight:400;letter-spacing:normal;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transition:opacity 160ms ease';
      const card = document.createElement('div');
      card.style.cssText = 'width:min(100%,420px);text-align:center';
      const icon = document.createElement('div');
      icon.setAttribute('aria-hidden', 'true');
      const animation = document.createElement('style');
      // Keep geometry and typography independent of the app stylesheet and web-font load.
      animation.textContent =
        '#studio-system-creation,#studio-system-creation *{box-sizing:border-box} @keyframes studio-system-create-spin{to{transform:rotate(360deg)}} @media(prefers-reduced-motion:reduce){#studio-system-creation [data-creation-spinner]{animation:none!important}}';
      surface.append(animation);
      icon.dataset.creationSpinner = '';
      icon.style.cssText =
        'width:32px;height:32px;margin:0 auto 24px;border:2px solid var(--creation-border,GrayText);border-top-color:var(--creation-foreground,CanvasText);border-radius:50%;animation:studio-system-create-spin 1s linear infinite';
      const title = document.createElement('h1');
      title.style.cssText =
        'font-family:inherit;font-style:normal;letter-spacing:normal;font-size:24px;line-height:1.3;font-weight:600;margin:0 0 12px;overflow-wrap:anywhere';
      title.dataset.creationTitle = '';
      const description = document.createElement('p');
      description.style.cssText =
        'font-family:inherit;font-style:normal;font-weight:400;letter-spacing:normal;font-size:14px;line-height:1.6;margin:0;color:var(--creation-muted,GrayText)';
      description.dataset.creationDescription = '';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Reload studio';
      retry.hidden = true;
      retry.style.cssText =
        'margin-top:24px;padding:8px 14px;border:1px solid var(--creation-border,GrayText);border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer';
      retry.onclick = () => location.reload();
      card.append(icon, title, description, retry);
      surface.append(card);
      document.body.append(surface);
      document.getElementById('root')?.setAttribute('inert', '');
      surface.focus();
    }
    for (const [name, value] of Object.entries(pending.appearance || {}))
      surface.style.setProperty(`--creation-${name}`, String(value));
    surface.querySelector('[data-creation-title]').textContent =
      pending.operation === 'delete'
        ? `Deleting ${pending.name}`
        : pending.id
          ? `Opening ${pending.name}`
          : `Creating ${pending.name}`;
    surface.querySelector('[data-creation-description]').textContent =
      pending.operation === 'delete'
        ? 'Removing this system and updating the studio.'
        : pending.id
          ? 'Your scaffold is ready. Opening your system.'
          : 'Preparing your theme, components, assets, and guidance.';
    timer = setTimeout(() => {
      surface.querySelector('[data-creation-description]').textContent =
        'This is taking longer than expected. Reload to check the studio. Your request will not be repeated.';
      surface.querySelector('button').hidden = false;
    }, 30000);
  }
  function finish(event) {
    const pending = read();
    if (event.detail?.id && pending?.id !== event.detail.id) return;
    clearTimeout(timer);
    sessionStorage.removeItem(key);
    document.getElementById('root')?.removeAttribute('inert');
    const previous = surface;
    surface = null;
    if (previous) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) previous.style.transition = 'none';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          previous.style.opacity = '0';
          setTimeout(() => previous.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
        }),
      );
    }
  }
  window.addEventListener('studio:system-creating', show);
  window.addEventListener('studio:system-created', finish);
  show();
})();
