import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button, buttonVariants } from './button';
export const Actions = () => <div className="flex flex-wrap gap-3"><Button size="lg">Get started<ArrowRight /></Button><Button variant="outline" size="lg">Explore the demo</Button></div>;
export const States = () => <div className="flex flex-wrap gap-3"><Button disabled>Unavailable</Button><Button disabled aria-busy="true"><LoaderCircle className="animate-spin" />Loading</Button></div>;
export const Links = () => <div className="flex gap-4"><a href="https://ui.shadcn.com" className={buttonVariants({ variant: 'link', size: 'sm' })}>shadcn/ui</a><a href="https://github.com/shadcn-ui/ui" className={buttonVariants({ variant: 'link', size: 'sm' })}>Source</a></div>;
