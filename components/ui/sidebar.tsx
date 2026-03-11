"use client";

import * as React from "react";
import { PanelLeftIcon } from "lucide-react";
import { Slot as SlotPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SIDEBAR_WIDTH = "18rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const open = openProp ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (setOpenProp) {
        setOpenProp(value);
        return;
      }

      setUncontrolledOpen(value);
    },
    [setOpenProp]
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
      return;
    }

    setOpen(!open);
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === SIDEBAR_KEYBOARD_SHORTCUT) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [isMobile, open, openMobile, setOpen, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-[calc(100dvh-73px)] w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, open, openMobile, setOpenMobile, state } = useSidebar();
  const desktopOpen = collapsible === "none" ? true : open;
  const sideClass = side === "right" ? "right-0" : "left-0";
  const desktopWidth =
    collapsible === "icon"
      ? desktopOpen
        ? "var(--sidebar-width)"
        : "var(--sidebar-width-icon)"
      : desktopOpen
        ? "var(--sidebar-width)"
        : "0rem";

  if (isMobile) {
    return (
      <>
        <div
          aria-hidden={!openMobile}
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
            openMobile ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpenMobile(false)}
        />
        <div
          data-slot="sidebar"
          data-mobile="true"
          className={cn(
            "fixed inset-y-0 z-50 flex w-[var(--sidebar-width-mobile)] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 lg:hidden",
            sideClass,
            openMobile
              ? "translate-x-0"
              : side === "right"
                ? "translate-x-full"
                : "-translate-x-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div
      data-slot="sidebar-gap"
      className={cn("relative hidden shrink-0 transition-[width] duration-200 lg:block")}
      style={{ width: desktopWidth }}
    >
      <div
        data-slot="sidebar"
        data-state={state}
        data-variant={variant}
        data-collapsible={collapsible}
        className={cn(
          "sticky top-0 flex h-dvh flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          variant === "floating" && "m-3 rounded-2xl border shadow-sm",
          variant === "inset" &&
            "my-3 ml-3 rounded-[1.75rem] border shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_rgba(3,10,18,0.28)]",
          collapsible === "icon" && !desktopOpen && "w-[var(--sidebar-width-icon)]",
          collapsible !== "icon" && !desktopOpen && "w-0 border-transparent",
          desktopOpen && "w-[var(--sidebar-width)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col h-full overflow-y-auto", className)}
      {...props}
    />
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-9 rounded-full", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          toggleSidebar();
        }
      }}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 -right-3 z-10 hidden w-3 cursor-ew-resize rounded-full bg-transparent lg:block",
        className
      )}
      onClick={toggleSidebar}
      type="button"
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-4 border-b border-sidebar-border p-4", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto flex flex-col gap-3 border-t border-sidebar-border p-4", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("list-none", className)}
      {...props}
    />
  );
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-sidebar-foreground/80 transition outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
