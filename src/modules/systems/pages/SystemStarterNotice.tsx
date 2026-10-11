import { Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/systems/studio/components/alert';

export default function SystemStarterNotice({ label }: { label: string }) {
  return (
    <Alert variant='info' role='note' aria-labelledby='system-example' className='mb-6'>
      <Info aria-hidden='true' />
      <AlertTitle id='system-example'>{label} is an example system</AlertTitle>
      <AlertDescription>
        Use it to explore Studio. Create your own system from the Systems page, or ask your agent to customize this
        example.
      </AlertDescription>
    </Alert>
  );
}
