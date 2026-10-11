import { Switch } from '@/systems/studio/components/switch';
import { Label } from '@/systems/studio/components/label';
export const Default = () => (
  <div className='flex items-center gap-3'>
    <Label htmlFor='switch-example'>Enable diagrams</Label>
    <Switch id='switch-example' defaultChecked />
  </div>
);
export const Disabled = () => (
  <div className='flex items-center gap-3'>
    <Label htmlFor='switch-required'>Required capability</Label>
    <Switch id='switch-required' defaultChecked disabled />
  </div>
);
