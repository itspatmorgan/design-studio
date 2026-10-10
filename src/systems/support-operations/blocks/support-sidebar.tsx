// Adapted from shadcn sidebar-07, CLI 4.21.0, Base UI Nova.
import { BarChart3, Inbox, Users, LifeBuoy, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "../components/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../components/collapsible";
import { Avatar, AvatarFallback } from "../components/avatar";
export type OperationsPage = "Overview" | "Inbox" | "Team";
export function SupportSidebar({
  page,
  onNavigate,
  onReport,
}: {
  page: OperationsPage;
  onNavigate: (page: OperationsPage) => void;
  onReport: (report: "volume" | "response") => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const go = (next: OperationsPage) => {
    onNavigate(next);
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => go("Overview")}
              aria-label="Support Operations home"
            >
              <LifeBuoy className="text-primary" />
              <span className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">Relay</span>
                <span className="text-xs text-muted-foreground">
                  Support operations
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {(
              [
                { name: "Overview", icon: BarChart3 },
                { name: "Inbox", icon: Inbox },
                { name: "Team", icon: Users },
              ] as const
            ).map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  tooltip={item.name}
                  isActive={page === item.name}
                  aria-label={item.name}
                  onClick={() => go(item.name)}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <Collapsible
              defaultOpen
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={<SidebarMenuButton tooltip="Reports" />}
              >
                <BarChart3 />
                <span>Reports</span>
                <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {(
                    [
                      { key: "volume", label: "Ticket volume" },
                      { key: "response", label: "Response time" },
                    ] as const
                  ).map((item) => (
                    <SidebarMenuSubItem key={item.key}>
                      <SidebarMenuSubButton
                        render={
                          <button
                            type="button"
                            onClick={() => {
                              onReport(item.key);
                              go("Overview");
                            }}
                          />
                        }
                      >
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="View team"
              aria-label="View team"
              onClick={() => go("Team")}
            >
              <Avatar>
                <AvatarFallback>AW</AvatarFallback>
              </Avatar>
              <span className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-medium">Avery Wilson</span>
                <span className="text-xs text-muted-foreground">Team lead</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
