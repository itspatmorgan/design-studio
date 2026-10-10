import {Collapsible,CollapsibleTrigger,CollapsibleContent} from '@/systems/support-operations/components/collapsible';
import {Button} from '@/systems/support-operations/components/button';
export const Reports=()=> <Collapsible><CollapsibleTrigger render={<Button variant="outline"/>}>Reports</CollapsibleTrigger><CollapsibleContent className="p-4">Ticket volume and response time.</CollapsibleContent></Collapsible>;
