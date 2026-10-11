import { Label } from '@/platform/systems/studio/components/label';
import { Input } from '@/platform/systems/studio/components/input';
export const Default = () => (
  <div className='space-y-2'>
    <Label htmlFor='label-studio-name'>Studio name</Label>
    <Input id='label-studio-name' defaultValue='Design Studio' />
  </div>
);
