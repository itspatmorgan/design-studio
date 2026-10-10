import {Skeleton} from '@/systems/support-operations/components/skeleton';
export const Loading=()=> <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full"/><div className="flex flex-col gap-2"><Skeleton className="h-4 w-48"/><Skeleton className="h-3 w-32"/></div></div>;
