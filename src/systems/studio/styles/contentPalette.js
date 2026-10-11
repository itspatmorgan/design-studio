// Flexoki by Steph Ango (MIT): https://stephango.com/flexoki.
// One accent palette for the editor, document code, and diagrams. Neutrals come
// from the platform theme; changing this palette does not change prototype themes.
export const contentPalette = {
  light: {
    red: '#AF3029',
    orange: '#BC5215',
    yellow: '#AD8301',
    green: '#66800B',
    cyan: '#24837B',
    blue: '#205EA6',
    purple: '#5E409D',
    magenta: '#A02F6F',
    comment: '#878580',
  },
  dark: {
    red: '#D14D41',
    orange: '#DA702C',
    yellow: '#D0A215',
    green: '#879A39',
    cyan: '#3AA99F',
    blue: '#4385BE',
    purple: '#8B7EC8',
    magenta: '#CE5D97',
    comment: '#878580',
  },
};

/** @param {'light' | 'dark'} mode */
export function editorPalette(mode) {
  return Object.fromEntries(Object.entries(contentPalette[mode]).map(([name, color]) => [`--fx-${name}`, color]));
}

/** Shiki's TextMate scopes differ from CodeMirror's tags, but share the color roles.
 * @param {'light' | 'dark'} mode
 */
export function documentCodeTheme(mode) {
  const p = contentPalette[mode];
  return {
    name: `studio-${mode}`,
    type: mode,
    colors: {
      'editor.background': mode === 'dark' ? '#171717' : '#FFFFFF',
      'editor.foreground': mode === 'dark' ? '#FAFAFA' : '#171717',
    },
    tokenColors: [
      { scope: ['keyword', 'storage'], settings: { foreground: p.green } },
      {
        scope: ['keyword.control.import', 'keyword.control.export', 'keyword.control.from'],
        settings: { foreground: p.red },
      },
      { scope: ['string'], settings: { foreground: p.cyan } },
      { scope: ['constant.numeric'], settings: { foreground: p.purple } },
      {
        scope: ['constant.language', 'support.type', 'entity.name.type', 'entity.name.class'],
        settings: { foreground: p.yellow },
      },
      { scope: ['variable', 'entity.other.attribute-name', 'support.variable'], settings: { foreground: p.blue } },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: p.orange } },
      { scope: ['entity.name.tag', 'constant.character.escape', 'string.regexp'], settings: { foreground: p.magenta } },
      { scope: ['punctuation', 'keyword.operator'], settings: { foreground: p.comment } },
      { scope: ['comment'], settings: { foreground: p.comment, fontStyle: 'italic' } },
      { scope: ['markup.heading'], settings: { foreground: p.orange, fontStyle: 'bold' } },
      { scope: ['markup.underline.link'], settings: { foreground: p.blue } },
    ],
  };
}
