import { Badge } from './badge';
export const Statuses = () => <div className="flex gap-2"><Badge>Open</Badge><Badge variant="secondary">Pending</Badge><Badge variant="outline">Resolved</Badge><Badge variant="destructive">Urgent</Badge></div>;
