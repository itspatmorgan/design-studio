import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from './select';
const items=[{label:'All statuses',value:'all'},{label:'Open',value:'open'},{label:'Pending',value:'pending'}];
export const StatusFilter = () => <Select items={items} defaultValue="all"><SelectTrigger aria-label="Ticket status"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>;
