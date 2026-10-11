// A text file: any file in the system content (src/platform/) that no other type claims, like a script in a
// skill's folder. It opens read-only as its text. It has no extensions of its own and prototypes
// don't use it: a prototype's other files stay plain files.
import { defineFileType } from '../../core/fileTypes.ts';

export default defineFileType({
  capabilities: { source: true, create: false, fidelity: false, embeds: [], actions: [] },
  inPrototype: false,
  inSystemContent: true,
  fallback: true,
  label: 'Text file',
  extensions: [],
  language: 'text',
});
