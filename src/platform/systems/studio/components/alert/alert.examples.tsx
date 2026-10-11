import { Alert, AlertTitle, AlertDescription } from '@/platform/systems/studio/components/alert';
import { HugeiconsIcon } from '@hugeicons/react';
import { Archive02Icon } from '@hugeicons/core-free-icons';
export const Info = () => (
  <Alert variant='info' role='note'>
    <HugeiconsIcon icon={Archive02Icon} />
    <AlertTitle>This system is archived</AlertTitle>
    <AlertDescription>Files are kept locally and excluded from deployment.</AlertDescription>
  </Alert>
);
export const Note = () => (
  <Alert role='note'>
    <AlertTitle>Settings are shared through Git</AlertTitle>
    <AlertDescription>Changes save locally. Share them through your team’s Git workflow.</AlertDescription>
  </Alert>
);
export const Error = () => (
  <Alert variant='destructive'>
    <AlertTitle>Settings could not save</AlertTitle>
    <AlertDescription>Reload settings before trying again.</AlertDescription>
  </Alert>
);
