import { Button } from './button';
export const Variants = () => <div className="flex flex-wrap gap-2"><Button>Assign ticket</Button><Button variant="outline">Export</Button><Button variant="secondary">Later</Button><Button disabled>Unavailable</Button></div>;
