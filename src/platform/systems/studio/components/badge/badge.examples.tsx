import { Badge } from '@/platform/systems/studio/components/badge';
export const Roles = () => (
  <div className='flex gap-2'>
    <Badge variant='secondary'>Admin</Badge>
    <Badge variant='outline'>Contributor</Badge>
  </div>
);
