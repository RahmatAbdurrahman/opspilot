import {
  LayoutDashboard,
  AlertCircle,
  Users,
  FileText,
  CheckSquare,
  Zap,
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  description: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/",
        icon: LayoutDashboard,
        description: "Revenue health at a glance",
      },
    ],
  },
  {
    label: "Revenue Operations",
    items: [
      {
        label: "Priorities",
        href: "/priorities",
        icon: AlertCircle,
        description: "Operational items needing attention",
      },
      {
        label: "Customers",
        href: "/customers",
        icon: Users,
        description: "Account health and engagement",
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: FileText,
        description: "Outstanding and overdue invoices",
      },
      {
        label: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        description: "Follow-ups and open items",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Actions",
        href: "/actions",
        icon: Zap,
        description: "AI-recommended actions",
      },
      {
        label: "Activity",
        href: "/activity",
        icon: Activity,
        description: "Audit log and history",
      },
    ],
  },
];
