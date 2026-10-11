import type { PrototypeInfo } from '@/platform/app/data/types';
import { repoPath } from '@/platform/app/data/files';
import { Button } from '@/systems/studio/components/button';
import { toast } from '@/systems/studio/components/toast';
import { systemLabel } from './DuplicatePrototypeDialog';

export default function PrototypeRebuildNotice({ proto }: { proto: PrototypeInfo }) {
  const request = proto.rebuild;
  if (proto.systemMissing)
    return (
      <div className='mb-3 rounded-md border bg-sidebar-accent/40 p-2.5 text-sm'>
        <p className='font-medium'>System deleted</p>
        <p className='mt-1 text-muted-foreground'>
          {proto.systemMissing.label} is unavailable. Rebuild this prototype with another system before rendering or
          publishing.
        </p>
        <Button
          size='sm'
          variant='outline'
          className='mt-2'
          onClick={() =>
            void navigator.clipboard
              .writeText(
                `Rebuild ${repoPath(proto, '')} with an active system I select. Its ${proto.systemMissing!.label} system was deleted. Preserve existing intent and source. Read AGENTS.md and the build-prototype skill. Migrate components, theme and meta.json systemId together. Remove systemMissing only after validation and visual review.`,
              )
              .then(
                () => toast.add({ title: 'Rebuild instructions copied' }),
                () => toast.add({ type: 'error', title: 'Could not copy instructions.' }),
              )
          }
        >
          Copy rebuild instructions
        </Button>
      </div>
    );
  if (!request) return null;
  async function copy() {
    const target = request!.targetSystemKey;
    const prompt = `Rebuild the prototype at ${repoPath(proto, '')} using ${systemLabel(target)} (${JSON.stringify(target)}).
Read the repository AGENTS.md and build-prototype skill first. This is a separate exploration copied from ${request!.sourcePath} (prototype ID ${request!.sourcePrototypeId}); preserve the original and work only in the copy.
The copy is currently assigned to ${systemLabel(proto.system)}. Its requested target is recorded in meta.json as rebuild.targetSystemId; this has not converted its code.
${target === null ? 'Use local components and CSS, without importing a shared system library or theme.' : `Read src/systems/${target}/AGENTS.md and the relevant system guidance. Reconstruct the copy with its components and styles.`}
Preserve the intent, content, flows, and behavior where possible. Explain any differences that cannot translate. Migrate the implementation and meta.json systemId assignment together to ${JSON.stringify(request!.targetSystemId)}. Verify the build and review the rendered views. Remove the rebuild field only when the migration is complete.`;
    try {
      await navigator.clipboard.writeText(prompt);
      toast.add({ title: 'Rebuild instructions copied. Paste them into your coding agent.' });
    } catch {
      toast.add({ type: 'error', title: 'Could not copy rebuild instructions.' });
    }
  }
  return (
    <div className='mb-3 rounded-md border bg-sidebar-accent/40 p-2.5 text-xs'>
      <p className='font-medium'>Rebuild needed</p>
      <p className='mt-1 text-muted-foreground'>
        Target: {systemLabel(request.targetSystemKey)}. The current system stays assigned until your agent rebuilds this
        copy.
      </p>
      {import.meta.env.DEV && (
        <Button size='sm' variant='outline' className='mt-2 h-7 text-xs' onClick={copy}>
          Copy rebuild instructions
        </Button>
      )}
    </div>
  );
}
