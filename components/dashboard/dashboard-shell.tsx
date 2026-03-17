import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type DashboardShellMode = 'scroll' | 'workflow';

const contentViewportClassNames: Record<DashboardShellMode, string> = {
  scroll: 'flex-1 min-h-0 overflow-y-auto',
  workflow: 'flex-1 min-h-0 overflow-hidden'
};

const contentInnerClassNames: Record<DashboardShellMode, string> = {
  scroll: 'mx-auto flex min-h-full w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8',
  workflow: 'mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8'
};

export async function DashboardShell({
  children,
  mode
}: {
  children: ReactNode;
  mode: DashboardShellMode;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.user || !workspace.team || !workspace.business) {
    redirect('/sign-in');
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        businessName={workspace.business.name}
        userEmail={workspace.user.email}
      />
      <SidebarInset>
        <DashboardHeader
          businessName={workspace.business.name}
          userEmail={workspace.user.email}
        />
        <div className={contentViewportClassNames[mode]}>
          <div className={contentInnerClassNames[mode]}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
