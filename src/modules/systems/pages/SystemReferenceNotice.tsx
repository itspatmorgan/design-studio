import { SYSTEM_SPECS } from '../data/systems';
import { systemFolder } from '@/platform/core/roots';
import { Button } from '@/platform/systems/studio/components/button';
import { toast } from '@/platform/systems/studio/components/toast';
export default function SystemReferenceNotice({ system }: { system: string }) {
  const files = SYSTEM_SPECS[system].renameReview;
  if (!files?.length) return null;
  return (
    <aside className='mb-6 rounded-md border bg-muted/40 p-4 text-sm' aria-label='References to review'>
      <p className='font-medium'>Some references need review</p>
      <p className='mt-1 text-muted-foreground'>
        The system was renamed. Your agent should check the remaining references in these files.
      </p>
      <ul className='my-2 list-disc pl-5'>
        {files.map(file => (
          <li key={file}>{file}</li>
        ))}
      </ul>
      <Button
        size='sm'
        variant='outline'
        onClick={() =>
          void navigator.clipboard
            .writeText(
              `Review remaining references after renaming the system to ${system}. Read AGENTS.md and src/${systemFolder(system)}/AGENTS.md. Check these files: ${files.join(', ')}. Repair relevant links without changing external source URLs. Verify the build, then clear renameReview in src/systems/${system}/system.ts.`,
            )
            .then(
              () => toast.add({ title: 'Cleanup instructions copied' }),
              () => toast.add({ type: 'error', title: 'Could not copy instructions.' }),
            )
        }
      >
        Copy cleanup instructions
      </Button>
    </aside>
  );
}
