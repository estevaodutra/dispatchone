import { PhoneCall } from "lucide-react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { EmptyState } from "@/components/dispatch";

export default function CallCampaigns() {
  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="telefonia" type="Ligação" />
      
      <div>
        <h1 className="text-2xl font-bold">Campanhas de Ligação</h1>
        <p className="text-muted-foreground">Chamadas de voz automáticas</p>
      </div>

      <EmptyState
        icon={PhoneCall}
        title="Em breve"
        description="Este tipo de campanha ainda está em desenvolvimento e estará disponível em breve."
      />
    </div>
  );
}
