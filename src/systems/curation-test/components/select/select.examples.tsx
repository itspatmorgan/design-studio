import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
const items=[{label:'All statuses',value:'all'},{label:'Open',value:'open'},{label:'Pending',value:'pending'}];
export const StatusFilter = () => <Select items={items} defaultValue="all"><SelectTrigger aria-label="Ticket status"><SelectValue /></SelectTrigger><SelectContent>{items.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>;
