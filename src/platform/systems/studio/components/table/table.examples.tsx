import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/platform/systems/studio/components/table';

export const Default = () => (
  <div className='w-full max-w-md rounded-lg border border-border'>
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead>Prop</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Default</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className='font-mono text-xs'>variant</TableCell>
          <TableCell className='font-mono text-xs'>string</TableCell>
          <TableCell className='font-mono text-xs'>"default"</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className='font-mono text-xs'>disabled</TableCell>
          <TableCell className='font-mono text-xs'>boolean</TableCell>
          <TableCell className='font-mono text-xs text-muted-foreground'>—</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);
