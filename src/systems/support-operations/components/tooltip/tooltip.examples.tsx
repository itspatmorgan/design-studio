import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from '@/systems/support-operations/components/tooltip';
import {Button} from '@/systems/support-operations/components/button';
export const Label=()=> <TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="outline"/>}>Response time</TooltipTrigger><TooltipContent>Average time to the first reply.</TooltipContent></Tooltip></TooltipProvider>;
