import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Phone,
  FileText,
  MessageSquare,
  Bell,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Code2,
  Radio,
  SendHorizontal,
  Users,
  Skull,
  Bot,
  PhoneCall,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/i18n";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  // Check if we're in any campaigns route
  const isCampaignsRoute = location.pathname.startsWith("/campaigns");
  const [campaignsOpen, setCampaignsOpen] = useState(isCampaignsRoute);

  const mainNavItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.callPanel"), url: "/painel-ligacoes", icon: PhoneCall },
    { title: t("nav.leads") || "Leads", url: "/leads", icon: Users },
    { title: t("nav.phoneNumbers"), url: "/numbers", icon: Phone },
    { title: t("nav.logs") || "Logs", url: "/logs", icon: FileText },
  ];

  const campaignSubItems = {
    whatsapp: [
      { title: "Disparos", url: "/campaigns/whatsapp/despacho", icon: SendHorizontal },
      { title: "Grupos", url: "/campaigns/whatsapp/grupos", icon: Users },
      { title: "Pirata", url: "/campaigns/whatsapp/pirata", icon: Skull, comingSoon: true },
    ],
    telefonia: [
      { title: "URA", url: "/campaigns/telefonia/ura", icon: Bot, comingSoon: true },
      { title: "Ligação", url: "/campaigns/telefonia/ligacao", icon: PhoneCall },
    ],
  };

  const systemNavItems = [
    { title: t("nav.instances"), url: "/instances", icon: MessageSquare },
    { title: t("nav.webhookEvents") || "Eventos", url: "/events", icon: Radio },
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

              {/* Campaigns with submenu */}
              <Collapsible
                open={campaignsOpen}
                onOpenChange={setCampaignsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t("nav.campaigns")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors w-full",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isCampaignsRoute && "bg-sidebar-accent text-sidebar-primary font-medium"
                      )}
                    >
                      <Megaphone className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{t("nav.campaigns")}</span>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              campaignsOpen && "rotate-90"
                            )}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {!isCollapsed && (
                      <SidebarMenuSub>
                        {/* WhatsApp section */}
                        <SidebarMenuSubItem>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </div>
                        </SidebarMenuSubItem>
                        {campaignSubItems.whatsapp.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  item.comingSoon && "opacity-50"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                                {item.comingSoon && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}

                        {/* Telefonia section */}
                        <SidebarMenuSubItem>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                            <Phone className="h-3 w-3" />
                            Telefonia
                          </div>
                        </SidebarMenuSubItem>
                        {campaignSubItems.telefonia.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  item.comingSoon && "opacity-50"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                                {item.comingSoon && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
