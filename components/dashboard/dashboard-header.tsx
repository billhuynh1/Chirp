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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {showToggle && (
          <>
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border/70" />
          </>
        )}
        <span className="text-sm font-medium text-foreground">
          {businessName}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <UserNav email={userEmail} />
      </div>
    </header>
  );
}
