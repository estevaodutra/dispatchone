import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { useLanguage } from "@/i18n";

export function CampaignsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const currentTab = location.pathname.includes("/campaigns/groups") ? "groups" : "dispatch";

  const handleTabChange = (value: string) => {
    if (value === "groups") {
      navigate("/campaigns/groups");
    } else {
      navigate("/campaigns");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("campaigns.title")}
        description={t("campaigns.description")}
      />

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dispatch">{t("campaigns.tabs.dispatch")}</TabsTrigger>
          <TabsTrigger value="groups">{t("campaigns.tabs.groups")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
