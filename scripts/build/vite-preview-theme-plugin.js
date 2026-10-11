// Studio and its previews can paint before their module graphs load. Apply the
// existing appearance preference synchronously; preview validation stays in the runtime.
export function installPreviewTheme(win) {
  try {
    const search = win.location.search;
    if (search.length > 8192) return;
    const params = new URLSearchParams(search);
    let dark;
    if (params.get('studio-preview') === '1') {
      const config = JSON.parse(params.get('config') ?? 'null');
      if (!config || typeof config.dark !== 'boolean') return;
      dark = config.dark;
    } else {
      // Match useColorMode: a saved preference wins; otherwise follow the system.
      let saved;
      try {
        saved = win.localStorage.getItem('design-studio:color-mode');
      } catch {
        /* Use the system when storage is unavailable. */
      }
      dark = saved == null ? win.matchMedia('(prefers-color-scheme: dark)').matches : saved === 'dark';
    }
    const doc = win.document;
    doc.documentElement.classList.toggle('dark', dark);
    const scheme = doc.createElement('meta');
    scheme.name = 'color-scheme';
    scheme.content = dark ? 'dark' : 'light';
    const background = doc.createElement('style');
    // Canvas supplies a browser background before CSS arrives. Existing Studio
    // tokens take over afterward; assigned systems still own their view surfaces.
    background.textContent = 'html { background-color: var(--background, Canvas); }';
    doc.head.append(scheme, background);
  } catch {
    /* Invalid addresses are reported by the preview runtime. */
  }
}

export default function previewTheme() {
  return {
    name: 'studio-preview-theme',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [{ tag: 'script', children: `(${installPreviewTheme.toString()})(window);`, injectTo: 'head-prepend' }];
      },
    },
  };
}
