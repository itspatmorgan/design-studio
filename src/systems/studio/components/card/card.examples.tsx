import { Button } from '@/systems/studio/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/systems/studio/components/card';

export const Default = () => (
  <Card className='w-xs'>
    <CardHeader>
      <CardTitle>Card title</CardTitle>
      <CardDescription>A short description.</CardDescription>
    </CardHeader>
    <CardContent className='text-sm text-muted-foreground'>Card content</CardContent>
    <CardFooter className='justify-end gap-2'>
      <Button variant='outline' size='sm'>
        Cancel
      </Button>
      <Button size='sm'>Save</Button>
    </CardFooter>
  </Card>
);
