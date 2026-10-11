import { Button } from '@/platform/systems/studio/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/platform/systems/studio/components/tooltip';

export const Sides = () => (
  <>
    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
      <Tooltip key={side}>
        <TooltipTrigger render={<Button variant='outline' />}>{side}</TooltipTrigger>
        <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
      </Tooltip>
    ))}
  </>
);
