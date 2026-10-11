import { Badge } from '@/systems/product/components/badge';
import { cn } from '@/lib/utils';
import { PRIORITIES, STATUSES, type Priority, type Status } from './store';

// Status colors come from the theme, so they follow light and dark mode.
const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-primary/10 text-primary dark:bg-primary/20',
  triaged: 'bg-secondary text-secondary-foreground',
  planned: 'bg-accent text-accent-foreground',
  resolved: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant="outline" className={cn('border-transparent', STATUS_STYLE[status])}>{STATUSES.find((s) => s.value === status)?.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const label = PRIORITIES.find((p) => p.value === priority)?.label;
  return <Badge variant={priority === 'high' ? 'destructive' : 'outline'}>{label}</Badge>;
}
