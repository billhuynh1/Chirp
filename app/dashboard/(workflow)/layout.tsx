import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { WorkflowScrollLock } from '@/components/dashboard/workflow-scroll-lock';

export default function DashboardWorkflowLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WorkflowScrollLock />
      <DashboardShell mode="workflow">{children}</DashboardShell>
    </>
  );
}
