import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/platform/systems/studio/components/select';

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export const Default = () => (
  <Select items={STATUSES}>
    <SelectTrigger className='w-48'>
      <SelectValue placeholder='Choose a status' />
    </SelectTrigger>
    <SelectContent>
      {STATUSES.map(s => (
        <SelectItem key={s.value} value={s.value}>
          {s.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const Grouped = () => (
  <Select items={[...STATUSES, { value: 'archived', label: 'Archived' }]}>
    <SelectTrigger className='w-48'>
      <SelectValue placeholder='Choose a status' />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Active</SelectLabel>
        {STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Set aside</SelectLabel>
        <SelectItem value='archived'>Archived</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);

export const Disabled = () => (
  <Select items={STATUSES} disabled>
    <SelectTrigger className='w-48'>
      <SelectValue placeholder='Choose a status' />
    </SelectTrigger>
    <SelectContent>
      {STATUSES.map(s => (
        <SelectItem key={s.value} value={s.value}>
          {s.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
