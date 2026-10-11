// How a row looks in a section's navigation: the file tree's files and folders, and the pages in a
// list. One place, so every navigation reads the same.

// A row's shape: 12px text, an icon slot, indented by depth. Selection changes immediately.
export const navRow =
  'mx-1 flex w-[calc(100%-8px)] min-w-0 items-center gap-1.5 rounded-md py-1 pr-1.5 text-[12px] leading-tight';
export const navIndent = (depth: number) => ({ paddingLeft: 8 + depth * 16 });

// A row's colors: the open one raised, the others quiet until hovered.
export const navRowState = (active: boolean) =>
  active
    ? 'bg-sidebar-foreground/10 font-medium text-sidebar-accent-foreground'
    : 'text-sidebar-foreground/80 hover:bg-sidebar-foreground/5 hover:text-sidebar-accent-foreground';
