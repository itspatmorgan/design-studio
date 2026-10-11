// Inert desktop preview, scaled and cropped by the embedding surface.
import type { EmbedProps } from '@/platform/app/data/fileTypeModule';
import PreviewHost from './preview/PreviewHost';
import { prototypeScopeOf } from './preview/protocol';
import { loadPreview } from './preview/target';
export const EMBED_VIEWPORT_WIDTH = 1440;

export default function ViewEmbed({ proto, item, width, height }: EmbedProps) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = width / EMBED_VIEWPORT_WIDTH;
  const preview = loadPreview({ proto, item });
  return (
    <div aria-hidden inert className='relative overflow-hidden bg-background' style={{ width, height }}>
      <div
        className='absolute left-0 top-0 flex origin-top-left'
        style={{ width: EMBED_VIEWPORT_WIDTH, height: height / scale, transform: 'scale(' + scale + ')' }}
      >
        <PreviewHost
          key={prototypeScopeOf(preview.target)}
          {...preview}
          surface='embed'
          width={EMBED_VIEWPORT_WIDTH}
          height={height / scale}
        />
      </div>
    </div>
  );
}
