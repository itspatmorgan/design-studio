import { useLayoutEffect, useRef, useState } from 'react';

// clientWidth measures the layout box, unaffected by canvas zoom transforms.
export function useDiagramEnvironment() {
  const host = useRef<HTMLElement>(null);
  const [environment, setEnvironment] = useState({
    width: 0,
    fontFamily: '',
    fontFamilyMono: '',
    dark: false,
    revision: 0,
  });
  useLayoutEffect(() => {
    const element = host.current!;
    let active = true;
    const measure = (invalidate = false) => {
      if (!active) return;
      const style = getComputedStyle(element);
      const width = Math.max(
        0,
        Math.floor(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
      );
      const fontFamily = style.fontFamily;
      const fontFamilyMono = style.getPropertyValue('--font-mono').trim() || 'monospace';
      const dark = document.documentElement.classList.contains('dark');
      setEnvironment(previous => {
        if (
          !invalidate &&
          previous.width === width &&
          previous.fontFamily === fontFamily &&
          previous.fontFamilyMono === fontFamilyMono &&
          previous.dark === dark
        )
          return previous;
        return { width, fontFamily, fontFamilyMono, dark, revision: previous.revision + 1 };
      });
    };
    const resize = new ResizeObserver(() => measure());
    resize.observe(element);
    const mutation = new MutationObserver(() => measure());
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      mutation.observe(parent, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    const fontsChanged = () => measure(true);
    document.fonts.addEventListener('loadingdone', fontsChanged);
    document.fonts.addEventListener('loadingerror', fontsChanged);
    const hotChanged = () => measure(true);
    import.meta.hot?.on('vite:afterUpdate', hotChanged);
    measure();
    return () => {
      active = false;
      resize.disconnect();
      mutation.disconnect();
      document.fonts.removeEventListener('loadingdone', fontsChanged);
      document.fonts.removeEventListener('loadingerror', fontsChanged);
      import.meta.hot?.off('vite:afterUpdate', hotChanged);
    };
  }, []);
  return { host, environment };
}
