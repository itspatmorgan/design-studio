// Fast tooltips for Excalidraw's controls. It labels buttons with native `title` attributes
// ("Rectangle — R or 2"), which the browser shows after a long delay, and we hide the toolbar's
// shortcut numbers. This swaps `title` for a quick tooltip that spells out the shortcut keys.
import { useEffect, useRef, useState, type RefObject } from 'react';

const SHOW_DELAY_MS = 120;
const ROOTS = [
  '.App-toolbar [title]',
  '.App-menu_top__left [title]',
  '.layer-ui__wrapper__footer [title]',
  '.layer-ui__wrapper__top-right [title]',
  '.sidebar-trigger[title]',
  '.help-icon[title]',
];
// Controls before (native `title`) and after (moved to `data-tip`) their first hover.
const CONTROLS = ROOTS.flatMap(sel => [sel, sel.replace('[title]', '[data-tip]')]).join(', ');

type Tip = { label: string; keys: string[]; x: number; y: number; below: boolean };

// "Rectangle — R or 2" → { label: "Rectangle", keys: ["R", "2"] }
function parse(title: string) {
  const [label, shortcut] = title.split(/\s+—\s+/);
  return {
    label: label.trim(),
    keys: shortcut
      ? shortcut
          .split(/\s+or\s+/)
          .map(k => k.trim())
          .filter(Boolean)
      : [],
  };
}

export function ControlTooltip({ container }: { container: RefObject<HTMLElement | null> }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    const root = container.current;
    if (!root) return undefined;
    const hide = () => {
      window.clearTimeout(timer.current);
      setTip(null);
    };
    const onOver = (event: PointerEvent) => {
      const control = (event.target as HTMLElement).closest<HTMLElement>(CONTROLS);
      if (!control || !root.contains(control)) return;
      // Move the native title aside so the browser's tooltip doesn't also appear.
      const title = control.getAttribute('title');
      if (title) {
        control.dataset.tip = title;
        control.removeAttribute('title');
      }
      const text = control.dataset.tip;
      if (!text) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const rect = control.getBoundingClientRect();
        const host = root.getBoundingClientRect();
        const below = rect.top - host.top < host.height / 2;
        setTip({
          ...parse(text),
          x: rect.left + rect.width / 2 - host.left,
          y: below ? rect.bottom - host.top + 8 : rect.top - host.top - 8,
          below,
        });
      }, SHOW_DELAY_MS);
    };
    const onOut = (event: PointerEvent) => {
      const control = (event.target as HTMLElement).closest<HTMLElement>('[data-tip]');
      if (control && control.contains(event.relatedTarget as Node | null)) return;
      hide();
    };
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    root.addEventListener('pointerdown', hide);
    return () => {
      window.clearTimeout(timer.current);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('pointerdown', hide);
    };
  }, [container]);

  if (!tip) return null;
  return (
    <div
      role='tooltip'
      className='canvas-tooltip'
      style={{ left: tip.x, top: tip.y, transform: tip.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}
    >
      <span>{tip.label}</span>
      {tip.keys.map(key => (
        <kbd key={key}>{key}</kbd>
      ))}
    </div>
  );
}
