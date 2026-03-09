import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
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
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
