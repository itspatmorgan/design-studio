import { Shapes01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/systems/studio/components/empty';
export default function MissingSystem({ label }: { label: string }) {
  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <Empty className='w-full border border-solid border-border/50 bg-muted/40 py-16'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <HugeiconsIcon icon={Shapes01Icon} />
          </EmptyMedia>
          <EmptyTitle>Rebuild needed</EmptyTitle>
          <EmptyDescription>
            The {label} system was deleted. Your prototype’s files are preserved. Copy the rebuild instructions from the
            sidebar to get started with another system.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
