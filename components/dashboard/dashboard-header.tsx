'use client';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { UserNav } from '@/components/dashboard/user-nav';

export function DashboardHeader({ 
  businessName,
  userEmail 
}: { 
  businessName: string;
  userEmail: string;
}) {
  const { state, isMobile } = useSidebar();
  
  // Only show the toggle in the header if the sidebar is collapsed or we're on mobile
  const showToggle = isMobile || state === 'collapsed';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-black/10 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        {showToggle && (
          <>
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          </>
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {businessName}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <UserNav email={userEmail} />
      </div>
    </header>
  );
}
