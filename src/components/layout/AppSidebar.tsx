import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Phone,
  FileText,
  MessageSquare,
  Bell,
  CreditCard,
  Settings,
  ChevronLeft,
  Zap,
  Code2,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/i18n";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const isCollapsed = state === "collapsed";

  const mainNavItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.campaigns"), url: "/campaigns", icon: Megaphone },
    { title: t("nav.groupCampaigns"), url: "/group-campaigns", icon: Users },
    { title: t("nav.phoneNumbers"), url: "/numbers", icon: Phone },
    { title: t("nav.dispatchLogs"), url: "/logs", icon: FileText },
  ];

  const systemNavItems = [
    { title: t("nav.instances"), url: "/instances", icon: MessageSquare },
    { title: t("nav.apiLogs"), url: "/api-logs", icon: Activity },
    { title: t("nav.alerts"), url: "/alerts", icon: Bell },
    { title: t("nav.billing"), url: "/billing", icon: CreditCard },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
    { title: t("nav.apiDocs"), url: "/api-docs", icon: Code2 },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-semibold text-sidebar-foreground">Dispatch</span>
              <span className="text-lg font-semibold text-primary">One</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarTrigger className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="ml-2 text-sm">{t("nav.collapse")}</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
