// How the app opens a view: its component, in its prototype system's theme.
import { CodeIcon } from '@hugeicons/core-free-icons';
import type { FileTypeModule } from '@/platform/app/data/fileTypeModule';
import { loadPreview } from './preview/target';
import ViewEmbed from './ViewEmbed';
import ViewFrame from './ViewFrame';

export default {
  icon: CodeIcon,
  load: async context => loadPreview(context),
  Page: ViewFrame,
  Embed: ViewEmbed,
  actions: [],
} satisfies FileTypeModule;
