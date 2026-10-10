/** @studio-id pxe5n3mt8r6xd0ac */
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  SlidersHorizontal,
  CalendarDays,
  LifeBuoy,
} from "lucide-react";
import {
  SupportSidebar,
  type OperationsPage,
} from "@/systems/support-operations/blocks/support-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/systems/support-operations/components/sidebar";
import { TooltipProvider } from "@/systems/support-operations/components/tooltip";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/systems/support-operations/components/breadcrumb";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/systems/support-operations/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/systems/support-operations/components/chart";
import { Button } from "@/systems/support-operations/components/button";
import { Input } from "@/systems/support-operations/components/input";
import { Badge } from "@/systems/support-operations/components/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/systems/support-operations/components/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/systems/support-operations/components/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/systems/support-operations/components/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/systems/support-operations/components/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/systems/support-operations/components/sheet";
import { Separator } from "@/systems/support-operations/components/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/systems/support-operations/components/dropdown-menu";
import { initialTickets, agents, activity, type Ticket } from "./_data";
const chartConfig = {
  received: { label: "Received", color: "var(--chart-2)" },
  resolved: { label: "Resolved", color: "var(--chart-4)" },
  response: { label: "Hours", color: "var(--chart-3)" },
} satisfies ChartConfig;
const queues = ["All queues", "Product", "Billing", "Accounts"];
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}
export default function OperationsDashboard() {
  const [page, setPage] = useState<OperationsPage>("Overview");
  const [range, setRange] = useState("14");
  const [report, setReport] = useState<"volume" | "response">("volume");
  const [tickets, setTickets] = useState(initialTickets);
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState("All queues");
  const [tab, setTab] = useState("active");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [saved, setSaved] = useState("");
  const data = activity.slice(-Number(range));
  const received = data.reduce((sum, item) => sum + item.received, 0);
  const resolved = data.reduce((sum, item) => sum + item.resolved, 0);
  const average = (
    data.reduce((sum, item) => sum + item.response, 0) / data.length
  ).toFixed(1);
  const active = tickets.filter((ticket) => ticket.status !== "Resolved");
  const urgent = active.filter((ticket) => ticket.priority === "Urgent");
  const filtered = tickets.filter(
    (ticket) =>
      (tab === "all" ||
        (tab === "active"
          ? ticket.status !== "Resolved"
          : ticket.priority === "Urgent" && ticket.status !== "Resolved")) &&
      (queue === "All queues" || ticket.queue === queue) &&
      `${ticket.id} ${ticket.subject} ${ticket.customer} ${ticket.owner}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const save = () => {
    if (!selected) return;
    setTickets((previous) =>
      previous.map((ticket) => (ticket.id === selected.id ? selected : ticket)),
    );
    setSaved(`Ticket #${selected.id} updated`);
    setSelected(null);
  };
  return (
    <TooltipProvider>
      <SidebarProvider>
        <SupportSidebar page={page} onNavigate={setPage} onReport={setReport} />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span>Workspace</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{page}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <span className="ml-auto text-xs text-muted-foreground">
              Demo workspace
            </span>
          </header>
          <main className="flex min-w-0 flex-col gap-6 p-4 lg:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <LifeBuoy className="size-4" />
                  Relay support
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {page === "Overview"
                    ? "A pulse on your support"
                    : page === "Inbox"
                      ? "Your team’s inbox"
                      : "The people behind every reply"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {page === "Overview"
                    ? "Spot the trends. Keep the queue moving."
                    : page === "Inbox"
                      ? "Prioritize, assign, and follow through."
                      : "A clear view of ownership and workload."}
                </p>
              </div>
              {page === "Overview" && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <Select
                    value={range}
                    onValueChange={(value) => {
                      if (value) setRange(value);
                    }}
                    items={[
                      { value: "7", label: "Last 7 days" },
                      { value: "14", label: "Last 14 days" },
                      { value: "30", label: "Last 30 days" },
                    ]}
                  >
                    <SelectTrigger aria-label="Reporting period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {["7", "14", "30"].map((value) => (
                          <SelectItem value={value} key={value}>
                            Last {value} days
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div role="status" className="sr-only">
              {saved}
            </div>
            {page === "Overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Tickets received",
                      value: received.toLocaleString(),
                      note: `Across ${range} days`,
                      trend: "Every channel",
                    },
                    {
                      label: "Resolved",
                      value: resolved.toLocaleString(),
                      note: `${Math.round((resolved / received) * 100)}% of incoming volume`,
                      trend: "Team throughput",
                    },
                    {
                      label: "First response",
                      value: `${average}h`,
                      note: "Average response time",
                      trend: "Within 3h target",
                    },
                    {
                      label: "Needs attention",
                      value: urgent.length.toString(),
                      note: `${active.length} active tickets`,
                      trend: "Urgent requests",
                    },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardHeader>
                        <CardDescription>{item.label}</CardDescription>
                        <CardTitle className="text-3xl">{item.value}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <ArrowDownRight className="size-3" />
                          {item.trend}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.note}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid min-w-0 gap-4 xl:grid-cols-3">
                  <Card className="min-w-0 xl:col-span-2">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle>Support activity</CardTitle>
                        <Tabs
                          value={report}
                          onValueChange={(value) =>
                            setReport(value as "volume" | "response")
                          }
                        >
                          <TabsList>
                            <TabsTrigger value="volume">Volume</TabsTrigger>
                            <TabsTrigger value="response">Response</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <CardDescription>
                        {report === "volume"
                          ? "Received and resolved tickets"
                          : "Average first-response time in hours"}{" "}
                        · last {range} days
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={chartConfig}
                        className="h-[240px] w-full aspect-auto"
                        aria-label={
                          report === "volume"
                            ? "Ticket volume chart"
                            : "Response time chart"
                        }
                      >
                        {report === "volume" ? (
                          <AreaChart accessibilityLayer data={data}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              minTickGap={28}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              width={28}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Area
                              type="monotone"
                              dataKey="received"
                              fill="var(--color-received)"
                              fillOpacity={0.15}
                              stroke="var(--color-received)"
                              isAnimationActive={false}
                            />
                            <Area
                              type="monotone"
                              dataKey="resolved"
                              fill="var(--color-resolved)"
                              fillOpacity={0.1}
                              stroke="var(--color-resolved)"
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        ) : (
                          <BarChart accessibilityLayer data={data}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              minTickGap={28}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              width={28}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar
                              dataKey="response"
                              fill="var(--color-response)"
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                          </BarChart>
                        )}
                      </ChartContainer>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>Queue workload</CardTitle>
                      <CardDescription>
                        Active requests by queue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        className="h-[240px] w-full aspect-auto"
                        config={{
                          count: {
                            label: "Active tickets",
                            color: "var(--chart-3)",
                          },
                        }}
                        aria-label="Queue workload chart"
                      >
                        <BarChart
                          accessibilityLayer
                          layout="vertical"
                          data={queues
                            .slice(1)
                            .map((name) => ({
                              name,
                              count: active.filter(
                                (ticket) => ticket.queue === name,
                              ).length,
                            }))}
                        >
                          <CartesianGrid horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={60}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar
                            dataKey="count"
                            fill="var(--color-count)"
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
            {page !== "Team" ? (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>
                    {page === "Overview"
                      ? "Keep the queue moving"
                      : "Ticket queue"}
                  </CardTitle>
                  <CardDescription>
                    Choose a ticket to review details and update its owner or
                    status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={tab}
                    onValueChange={(value) => setTab(value as string)}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <TabsList>
                        <TabsTrigger value="active">
                          Active ({active.length})
                        </TabsTrigger>
                        <TabsTrigger value="urgent">
                          Urgent ({urgent.length})
                        </TabsTrigger>
                        <TabsTrigger value="all">All tickets</TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-48"
                          aria-label="Search tickets"
                          placeholder="Search tickets"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={`Filter queue: ${queue}`}
                              />
                            }
                          >
                            <SlidersHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Queue</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={queue}
                                onValueChange={setQueue}
                              >
                                {queues.map((value) => (
                                  <DropdownMenuRadioItem
                                    value={value}
                                    key={value}
                                  >
                                    {value}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {["active", "urgent", "all"].map((value) => (
                      <TabsContent value={value} key={value}>
                        <Table aria-label="Support tickets">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Request</TableHead>
                              <TableHead>Queue</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Owner</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead>
                                <span className="sr-only">Details</span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((ticket) => (
                              <TableRow key={ticket.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {ticket.subject}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    #{ticket.id} · {ticket.customer}
                                  </div>
                                </TableCell>
                                <TableCell>{ticket.queue}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      ticket.priority === "Urgent" &&
                                      ticket.status !== "Resolved"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {ticket.priority === "Urgent" &&
                                    ticket.status !== "Resolved"
                                      ? "Urgent"
                                      : ticket.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar size="sm">
                                      <AvatarFallback>
                                        {initials(ticket.owner)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="whitespace-nowrap">
                                      {ticket.owner.split(" ")[0]}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{ticket.age}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Open ticket ${ticket.id}`}
                                    onClick={() => setSelected({ ...ticket })}
                                  >
                                    <ArrowUpRight />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {!filtered.length && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No matching tickets.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        <div className="mt-3 flex items-center justify-between">
                          <p
                            className="text-xs text-muted-foreground"
                            aria-live="polite"
                          >
                            {filtered.length}{" "}
                            {filtered.length === 1 ? "ticket" : "tickets"} ·{" "}
                            {queue}
                          </p>
                          {(query || queue !== "All queues") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setQuery("");
                                setQueue("All queues");
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Team workload</CardTitle>
                  <CardDescription>
                    Ticket ownership updates here when you reassign a request.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table aria-label="Team workload">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teammate</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Urgent</TableHead>
                        <TableHead>Resolved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {initials(agent)}
                                </AvatarFallback>
                              </Avatar>
                              {agent}
                            </div>
                          </TableCell>
                          <TableCell>
                            {
                              active.filter((ticket) => ticket.owner === agent)
                                .length
                            }
                          </TableCell>
                          <TableCell>
                            {
                              urgent.filter((ticket) => ticket.owner === agent)
                                .length
                            }
                          </TableCell>
                          <TableCell>
                            {
                              tickets.filter(
                                (ticket) =>
                                  ticket.owner === agent &&
                                  ticket.status === "Resolved",
                              ).length
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <p className="text-xs text-muted-foreground">
              Synthetic September data · changes stay in this preview.
            </p>
          </main>
        </SidebarInset>
        <Sheet
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <SheetContent>
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.subject}</SheetTitle>
                  <SheetDescription>
                    #{selected.id} · {selected.customer}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4">
                  <Badge
                    className="w-fit"
                    variant={
                      selected.priority === "Urgent" ? "default" : "secondary"
                    }
                  >
                    {selected.priority} priority
                  </Badge>
                  <p className="text-sm leading-relaxed">{selected.message}</p>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" id="owner-label">
                      Assigned to
                    </label>
                    <Select
                      value={selected.owner}
                      onValueChange={(value) => {
                        if (value) setSelected({ ...selected, owner: value });
                      }}
                      items={agents.map((value) => ({ value, label: value }))}
                    >
                      <SelectTrigger
                        aria-labelledby="owner-label"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {agents.map((value) => (
                            <SelectItem value={value} key={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" id="status-label">
                      Status
                    </label>
                    <Select
                      value={selected.status}
                      onValueChange={(value) => {
                        if (value)
                          setSelected({
                            ...selected,
                            status: value as Ticket["status"],
                          });
                      }}
                      items={["Open", "Pending", "Resolved"].map((value) => ({
                        value,
                        label: value,
                      }))}
                    >
                      <SelectTrigger
                        aria-labelledby="status-label"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {["Open", "Pending", "Resolved"].map((value) => (
                            <SelectItem value={value} key={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={save}>
                    <Check data-icon="inline-start" />
                    Save changes
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Cancel
                  </Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      </SidebarProvider>
    </TooltipProvider>
  );
}
