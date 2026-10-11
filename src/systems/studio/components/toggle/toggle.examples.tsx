import { Toggle } from '@/systems/studio/components/toggle';

// Each export named with a capital is one example on the component's page, shown live with its code.
export const Default = () => (
  <Toggle aria-label='Bold'>
    <b>B</b>
  </Toggle>
);

export const Outline = () => (
  <Toggle variant='outline' aria-label='Italic'>
    <i>I</i>
  </Toggle>
);
