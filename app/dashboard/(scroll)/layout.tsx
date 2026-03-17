import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function DashboardScrollLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="scroll">{children}</DashboardShell>;
}
