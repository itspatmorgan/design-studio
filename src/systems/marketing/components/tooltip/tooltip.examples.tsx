import { Button } from '../button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './tooltip';
export const Default = () => <TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="outline" />}>About this system</TooltipTrigger><TooltipContent>Marketing owns this popup.</TooltipContent></Tooltip></TooltipProvider>;
