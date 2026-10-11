import { Checkbox } from '@/platform/systems/studio/components/checkbox';
import { Label } from '@/platform/systems/studio/components/label';
export const Default = () => (
  <div className='flex items-center gap-2'>
    <Checkbox id='checkbox-admin' />
    <Label htmlFor='checkbox-admin'>Admin</Label>
  </div>
);
export const Disabled = () => <Checkbox aria-label='Unavailable Admin assignment' defaultChecked disabled />;
