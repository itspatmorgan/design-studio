import { defineFileType, diagramIdentity } from '../../core/fileTypes.ts';

export default defineFileType({
  capabilities: { source: true, create: true, fidelity: false, embeds: ['document', 'canvas'], actions: [] },
  inPrototype: true,
  inSystemContent: false,
  fallback: false,
  label: 'Diagram',
  identity: diagramIdentity,
  extensions: ['.mermaid', '.mmd'],
  language: 'mermaid',
  template: () => `flowchart LR
  accTitle: A new diagram
  accDescr: A starting point connects an idea to its next step.
  idea[Idea] --> next[Next step]
`,
});
