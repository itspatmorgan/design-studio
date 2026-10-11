// How the app opens a canvas: Excalidraw, loaded when the first canvas opens.
import { lazy } from 'react';
import { lazyRouteComponent } from '@tanstack/react-router';
import { CanvasIcon } from '@hugeicons/core-free-icons';
import type { FileTypeModule } from '@/platform/app/data/fileTypeModule';
import type { Artifact, Prototype } from '@/platform/app/data/types';
import { preloadIdentity, readSource } from '@/platform/app/data/files';
import { canvasFiles } from './loader';
import { rootOf } from '@/platform/core/roots';
import { CanvasEmbedPending } from './CanvasOpening';
import './canvas.css';

const preload = () => import('./Canvas');
const Canvas = lazyRouteComponent(preload);
const CanvasEmbed = lazy(() => import('./CanvasEmbed'));

export default {
  icon: CanvasIcon,

  async load({ proto, item }) {
    const key = `/${rootOf(proto.contributorKey, proto.id)}/${item.path}`;
    // Dev reads the file itself, so an agent's changes show; the deployed site has it bundled.
    const [file] = await Promise.all([
      import.meta.env.DEV
        ? readSource(proto, item.path)
        : canvasFiles[key]?.().then(content => ({ content, version: '' })),
      import.meta.env.DEV ? preloadIdentity() : undefined,
    ]);
    return file && { proto, item, text: file.content, version: file.version };
  },

  Page: Canvas,
  Embed: CanvasEmbed,
  EmbedPending: CanvasEmbedPending,
} satisfies FileTypeModule<{ proto: Prototype; item: Artifact; text: string; version: string }>;
