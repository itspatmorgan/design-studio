import { Flowchart01Icon } from '@hugeicons/core-free-icons';
import type { FileTypeModule } from '@/platform/app/data/fileTypeModule';
import Diagram, { type DiagramProps } from './Diagram';
import DiagramEmbed from './DiagramEmbed';
import { loadDiagram } from './load';

export default {
  icon: Flowchart01Icon,
  load: loadDiagram,
  Page: Diagram,
  Embed: DiagramEmbed,
} satisfies FileTypeModule<DiagramProps>;
