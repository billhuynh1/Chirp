import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function DashboardWorkflowLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="workflow">{children}</DashboardShell>;
}
