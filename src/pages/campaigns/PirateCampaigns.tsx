import { Skull } from "lucide-react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { EmptyState } from "@/components/dispatch";

export default function PirateCampaigns() {
  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Pirata" />
      
      <div>
        <h1 className="text-2xl font-bold">Campanhas Pirata</h1>
        <p className="text-muted-foreground">Campanha especial</p>
      </div>

      <EmptyState
        icon={Skull}
        title="Em breve"
        description="Este tipo de campanha ainda está em desenvolvimento e estará disponível em breve."
      />
    </div>
  );
}
