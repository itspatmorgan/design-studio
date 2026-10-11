import { Kbd, KbdGroup } from '@/platform/systems/studio/components/kbd';

// Each export named with a capital is one example on the component's page, shown live with its code.
export const Default = () => <Kbd>⌘K</Kbd>;

export const Group = () => (
  <KbdGroup>
    <Kbd>⌘</Kbd>
    <Kbd>⇧</Kbd>
    <Kbd>P</Kbd>
  </KbdGroup>
);
