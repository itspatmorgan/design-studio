export type Ticket = {
  id: number;
  subject: string;
  customer: string;
  queue: string;
  status: "Open" | "Pending" | "Resolved";
  priority: "Normal" | "Urgent";
  owner: string;
  age: string;
  message: string;
};
export const agents = [
  "Avery Wilson",
  "Jordan Park",
  "Riley Chen",
  "Casey Reed",
];
export const initialTickets: Ticket[] = [
  {
    id: 1048,
    subject: "Shared inbox permissions",
    customer: "Lina at Northstar",
    queue: "Product",
    status: "Open",
    priority: "Urgent",
    owner: "Avery Wilson",
    age: "12 min",
    message:
      "Our new teammates can sign in, but they cannot see the shared inbox. We need everyone ready for the afternoon shift.",
  },
  {
    id: 1047,
    subject: "Invoice billing address",
    customer: "Theo at Meridian",
    queue: "Billing",
    status: "Open",
    priority: "Normal",
    owner: "Jordan Park",
    age: "24 min",
    message:
      "Please update the billing address on our September invoice. Our finance team needs the revised copy.",
  },
  {
    id: 1046,
    subject: "Export missing recent records",
    customer: "Sam at Kite",
    queue: "Product",
    status: "Pending",
    priority: "Urgent",
    owner: "Riley Chen",
    age: "48 min",
    message:
      "The export appears to stop at yesterday. Could you check whether today’s records have finished processing?",
  },
  {
    id: 1045,
    subject: "Add a workspace administrator",
    customer: "Aria at Common",
    queue: "Accounts",
    status: "Open",
    priority: "Normal",
    owner: "Casey Reed",
    age: "1 hr",
    message:
      "Our workspace administrator is away. We would like to add a second administrator.",
  },
  {
    id: 1044,
    subject: "Upgrade renewal date",
    customer: "Max at Studio Nine",
    queue: "Billing",
    status: "Pending",
    priority: "Normal",
    owner: "Jordan Park",
    age: "2 hr",
    message:
      "If we upgrade today, will the renewal date stay the same? We want to confirm before changing plans.",
  },
  {
    id: 1043,
    subject: "Notification preferences saved",
    customer: "Nora at Orbit",
    queue: "Product",
    status: "Resolved",
    priority: "Normal",
    owner: "Avery Wilson",
    age: "3 hr",
    message:
      "The new notification preferences are working. Thank you for the quick response.",
  },
];
export const activity = Array.from({ length: 30 }, (_, i) => ({
  day: `Sep ${i + 1}`,
  received: 45 + ((i * 17) % 32),
  resolved: 41 + ((i * 11) % 29),
  response: Math.round((2.6 - ((i * 3) % 13) / 10) * 10) / 10,
}));
