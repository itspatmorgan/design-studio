// #studio/components: the components of Studio's own interface system (src/platform/systems/studio/), which the
// shell and modules render with. Each is documented on its page under Systems > Studio. Browser code only.
/** @experimental Alert, from Studio's interface system. */
export { Alert, AlertTitle, AlertDescription, AlertAction } from '../systems/studio/components/alert/index.ts';
/** @experimental Badge, from Studio's interface system. */
export { Badge, badgeVariants } from '../systems/studio/components/badge/index.ts';
/** @experimental Button, from Studio's interface system. */
export { Button, buttonVariants } from '../systems/studio/components/button/index.ts';
/** @experimental Checkbox, from Studio's interface system. */
export { Checkbox } from '../systems/studio/components/checkbox/index.ts';
/** @experimental Collapsible, from Studio's interface system. */
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../systems/studio/components/collapsible/index.ts';
/** @experimental Command menu, from Studio's interface system. */
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '../systems/studio/components/command/index.ts';
/** @experimental Context menu, from Studio's interface system. */
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from '../systems/studio/components/context-menu/index.ts';
/** @experimental Dialog, from Studio's interface system. */
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../systems/studio/components/dialog/index.ts';
/** @experimental Dropdown menu, from Studio's interface system. */
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../systems/studio/components/dropdown-menu/index.ts';
/** @experimental Empty state, from Studio's interface system. */
export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '../systems/studio/components/empty/index.ts';
/** @experimental Input, from Studio's interface system. */
export { Input } from '../systems/studio/components/input/index.ts';
/** @experimental Input group, from Studio's interface system. */
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from '../systems/studio/components/input-group/index.ts';
/** @experimental Select, from Studio's interface system. */
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../systems/studio/components/select/index.ts';
/** @experimental Table, from Studio's interface system. */
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../systems/studio/components/table/index.ts';
/** @experimental Tabs, from Studio's interface system. */
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from '../systems/studio/components/tabs/index.ts';
/** @experimental Textarea, from Studio's interface system. */
export { Textarea } from '../systems/studio/components/textarea/index.ts';
/** @experimental The app's toast manager: toast.add({ title }) shows a short message. */
export { toast } from '../systems/studio/components/toast/index.ts';
/** @experimental Tooltip, from Studio's interface system. */
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../systems/studio/components/tooltip/index.ts';
