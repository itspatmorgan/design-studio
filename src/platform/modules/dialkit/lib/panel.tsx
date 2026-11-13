// The DialKit panel in a local Studio's view preview, loaded only there (index.tsx). DialKit draws it; Studio swaps
// its Copy parameters button for Apply, which writes the values into the view's code through the same
// version-checked save as Studio's source editor, so a file changed meanwhile is never overwritten.
import 'dialkit/styles.css';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { DialRoot, DialStore } from 'dialkit';
import {
  CHANNEL,
  isHidden,
  isToggleShortcut,
  sameTarget,
  setHidden,
  subscribeHidden,
  type ChannelMessage,
  type Panels,
  type Target,
} from './shared';

const HOST = 'data-studio-dialkit';
const APPLY = 'data-studio-apply';

const target = (): Target | null => {
  try {
    return JSON.parse(document.documentElement.dataset.previewTarget ?? '');
  } catch {
    return null;
  }
};
const livePanels = (): Panels =>
  DialStore.getPanels('panel').map(panel => ({ name: panel.name, values: DialStore.getValues(panel.id) }));

export function start() {
  if (document.querySelector(`[${HOST}]`)) return;
  const host = document.createElement('div');
  host.setAttribute(HOST, '');
  document.body.append(host);
  // Apply replaces DialKit's Copy parameters: in Studio, the values go straight into the code.
  const style = document.createElement('style');
  style.textContent = `.dialkit-toolbar-primary:not([${APPLY}]) { display: none; }`;
  document.head.append(style);
  createRoot(host).render(<StudioDials />);
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = ({ data }: MessageEvent<ChannelMessage>) => {
    if (data?.kind === 'request' && sameTarget(data.target, target()))
      channel.postMessage({ kind: 'values', id: data.id, panels: livePanels() } satisfies ChannelMessage);
  };
  window.addEventListener('keydown', event => {
    if (!isToggleShortcut(event)) return;
    event.preventDefault();
    setHidden(!isHidden());
  });
}

function StudioDials() {
  const hidden = useSyncExternalStore(subscribeHidden, isHidden);
  const dark = useDarkTheme();
  const toolbars = useToolbars(!hidden);
  if (hidden) return null;
  return (
    <>
      <DialRoot productionEnabled theme={dark ? 'dark' : 'light'} />
      {toolbars.map((toolbar, index) => createPortal(<ApplyButton />, toolbar, String(index)))}
    </>
  );
}

// Studio's theme reaches the preview as a class on its root element.
function useDarkTheme() {
  const read = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

// The header toolbars DialKit draws, one per group, where Apply goes.
function useToolbars(active: boolean) {
  const [toolbars, setToolbars] = useState<Element[]>([]);
  useEffect(() => {
    if (!active) return;
    const read = () => {
      const next = [...document.querySelectorAll('.dialkit-panel-toolbar')];
      setToolbars(current =>
        current.length === next.length && current.every((t, i) => t === next[i]) ? current : next,
      );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);
  return toolbars;
}

type Status = 'idle' | 'applying' | 'applied';
let status: Status = 'idle';
const listeners = new Set<() => void>();
const setStatus = (next: Status) => {
  status = next;
  for (const listener of listeners) listener();
};
const subscribeStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

async function request<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body && JSON.stringify(body),
  });
  const reply = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(reply.error ?? `Couldn’t apply the dials (${response.status}).`);
  return reply as T;
}

// Applies every group in this view at once: read the file, set the new defaults, save it if it hasn't changed.
async function applyToCode() {
  const view = target();
  if (!view || status === 'applying') return;
  setStatus('applying');
  try {
    const { contributor, prototype, artifact: path } = view;
    const query = new URLSearchParams({ contributor, prototype, path });
    const file = await request<{ content: string; version: string }>(`/__studio/file?${query}`);
    const { content } = await request<{ content: string }>('/__studio/dialkit/transform', {
      action: 'apply',
      source: file.content,
      panels: livePanels(),
    });
    if (content !== file.content)
      await request('/__studio/write', { contributor, prototype, path, content, base: file.version });
    setStatus('applied');
    setTimeout(() => status === 'applied' && setStatus('idle'), 1600);
  } catch (error) {
    setStatus('idle');
    // Studio shows it as a toast (app.tsx).
    const message = error instanceof Error ? error.message : 'Couldn’t apply the dials.';
    new BroadcastChannel(CHANNEL).postMessage({ kind: 'error', message } satisfies ChannelMessage);
  }
}

function ApplyButton() {
  const current = useSyncExternalStore(subscribeStatus, () => status);
  return (
    <button
      type='button'
      {...{ [APPLY]: '' }}
      className='dialkit-toolbar-add dialkit-toolbar-primary'
      data-wide='true'
      title='Write these values into the view’s code'
      disabled={current === 'applying'}
      onClick={() => void applyToCode()}
    >
      <svg
        viewBox='0 0 24 24'
        width={16}
        height={16}
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
      >
        {current === 'applied' ? <path d='M20 6 9 17l-5-5' /> : <path d='m16 18 6-6-6-6M8 6l-6 6 6 6' />}
      </svg>
      <span>{current === 'applying' ? 'Applying…' : current === 'applied' ? 'Applied' : 'Apply to code'}</span>
    </button>
  );
}
