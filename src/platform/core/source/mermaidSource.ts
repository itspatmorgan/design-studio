// Highlighting is an editor aid; Mermaid itself remains the authority for rendering.
import { HighlightStyle, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import {
  mermaidLanguage,
  mindmapTags,
  flowchartTags,
  sequenceTags,
  journeyTags,
  requirementTags,
} from 'codemirror-lang-mermaid';

// These tokens have no standard parent tag styled by sourceTheme. Use the same Flexoki
// palette for them in standalone diagrams and fenced Markdown code.
const highlight = HighlightStyle.define([
  {
    tag: [
      mindmapTags.lineText1,
      mindmapTags.lineText2,
      mindmapTags.lineText3,
      mindmapTags.lineText4,
      mindmapTags.lineText5,
    ],
    color: 'var(--fx-cyan)',
  },
  { tag: [flowchartTags.nodeId, sequenceTags.nodeText, journeyTags.actor], color: 'var(--fx-blue)' },
  { tag: [flowchartTags.orientation, sequenceTags.position], color: 'var(--fx-green)' },
  { tag: [sequenceTags.messageText2, requirementTags.unquotedString], color: 'var(--fx-cyan)' },
]);

export function mermaidSource() {
  return new LanguageSupport(mermaidLanguage, syntaxHighlighting(highlight));
}
