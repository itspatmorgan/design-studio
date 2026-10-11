import { Separator } from '@/platform/systems/studio/components/separator';

// Each export named with a capital is one example on the component's page, shown live with its code.
export const Default = () => (
  <div className='w-64 text-sm'>
    <div>Above</div>
    <Separator className='my-2' />
    <div>Below</div>
  </div>
);

export const Vertical = () => (
  <div className='flex h-5 items-center gap-3 text-sm'>
    <span>Docs</span>
    <Separator orientation='vertical' />
    <span>Source</span>
  </div>
);
