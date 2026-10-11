// A view: a React component in a .tsx or .jsx file, opened as a page in the prototype.
import { defineFileType, viewIdentity } from '../../platform/core/fileTypes.ts';

// Lofi is a comment at the top of the view, above any code: /** @lofi */
const HEADER = /^\uFEFF?(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*/;
const TAG = /@lofi\b/;
// A comment that holds only the tag, which goes whole when lofi is switched off.
const ONLY_TAG = /^(\uFEFF?)[ \t]*\/\*\*?[ \t]*@lofi[ \t]*\*\/[ \t]*\r?\n?/;
const isLofi = (source: string) => TAG.test(HEADER.exec(source)?.[0] ?? '');
function setLofi(source: string, on: boolean) {
  const has = isLofi(source);
  if (on) {
    if (has) return source;
    const bom = source.startsWith('\uFEFF') ? '\uFEFF' : '';
    return `${bom}/** @lofi */\n${source.slice(bom.length)}`;
  }
  if (!has) return source;
  if (ONLY_TAG.test(source)) return source.replace(ONLY_TAG, '$1');
  const header = HEADER.exec(source)![0];
  return header.replace(/[ \t]*@lofi\b/, '') + source.slice(header.length);
}

export default defineFileType({
  capabilities: { source: true, create: true, fidelity: true, embeds: ['document', 'canvas'], actions: [] },
  inPrototype: true,
  inSystemContent: false,
  fallback: false,
  label: 'View',
  identity: viewIdentity,
  extensions: ['.tsx', '.jsx'],
  language: 'tsx',
  fidelity: { isLofi, setLofi },

  // It starts as emptyView (src/lib/emptyView.ts), which the platform shows as an empty page, until something is built in it.
  template: () =>
    `import { emptyView } from '@/lib/emptyView';\n\n// Empty until something is built here: describe it to your agent, who replaces this export with the view.\nexport default emptyView;\n`,

  // The app renders a view's default export.
  check: ({ source }) =>
    /export\s+default\b|export\s*\{[^}]*\bas\s+default\b/.test(source)
      ? []
      : [
          'a view needs a default export, the component the app renders (export default function MyView() { ... }). Helpers belong in a file or folder named with a leading underscore (_components/).',
        ],
});
