'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BellRing,
  Building2,
  Inbox,
  LayoutDashboard,
  MapPinned,
  Settings2
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/setup', label: 'Setup', icon: Building2 },
  { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings2 }
];

export function AppSidebar({
  businessName,
  userEmail
}: {
  businessName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarTrigger />
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <div>
              <p className="font-medium">{businessName}</p>
              <p className="text-xs text-sidebar-foreground/60">{userEmail}</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={closeMobileSidebar}>
                        <item.icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>Urgent alerting</SidebarGroupLabel>
          <SidebarGroupContent>
            <div>
              <BellRing size={16} />
              <p>Email alerts are enabled for urgent negative reviews.</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Google-first</SidebarGroupLabel>
          <SidebarGroupContent>
            <div>
              <MapPinned size={16} />
              <p>V1 is optimized for Google Business Profile with manual posting after approval.</p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
