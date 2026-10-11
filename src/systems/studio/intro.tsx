import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  FavouriteIcon,
  FilterIcon,
  Home01Icon,
  InformationCircleIcon,
  LinkSquare02Icon,
  Mail01Icon,
  Menu01Icon,
  Notification01Icon,
  PencilEdit01Icon,
  Search01Icon,
  Settings01Icon,
  StarIcon,
  Tick02Icon,
  Upload01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { IconGrid } from '@/modules/systems/pages/foundations';
import type { SystemIntro } from '@/platform/app/data/types';

const ICONS = {
  Search01Icon,
  Add01Icon,
  Settings01Icon,
  UserIcon,
  Notification01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  Tick02Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Mail01Icon,
  Calendar03Icon,
  Home01Icon,
  FilterIcon,
  Download01Icon,
  Upload01Icon,
  Copy01Icon,
  LinkSquare02Icon,
  InformationCircleIcon,
  Alert02Icon,
  StarIcon,
  FavouriteIcon,
  Menu01Icon,
};

export default {
  summary: 'The system used to build Design Studio’s interface, maintained by the platform.',
  overview: {
    guidance:
      'Defines Studio’s interface writing conventions. Platform and module context and skills are maintained with their owning capabilities.',
    code: 'Supplies Studio’s interface through its vendored shadcn/ui components and neutral theme, including typography, spacing, colors, and motion.',
  },
  icons: {
    library: 'HugeIcons (@hugeicons/react + @hugeicons/core-free-icons)',
    href: 'https://hugeicons.com/icons',
    snippet: `import { HugeiconsIcon } from '@hugeicons/react';\nimport { Search01Icon } from '@hugeicons/core-free-icons';\n\n<HugeiconsIcon icon={Search01Icon} size={16} />`,
    grid: (
      <IconGrid icons={Object.entries(ICONS).map(([name, icon]) => ({ name, node: <HugeiconsIcon icon={icon} /> }))} />
    ),
  },
} satisfies SystemIntro;
