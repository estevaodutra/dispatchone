import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useExportPirateCampaign() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setIsExporting(true);

      // Fetch Campaign Info
      const { data: campaign, error: campaignError } = await (supabase as any)
        .from("pirate_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignError) throw campaignError;

      // Create export object
      const exportData = {
        version: "1.0",
        type: "pirate_campaign",
        campaign: {
          name: campaign.name,
          description: campaign.description,
          webhook_url: campaign.webhook_url,
          webhook_headers: campaign.webhook_headers,
          auto_create_lead: campaign.auto_create_lead,
          ignore_duplicates: campaign.ignore_duplicates,
          capture_link: campaign.capture_link,
          profile_photo_url: campaign.profile_photo_url,
          profile_name: campaign.profile_name,
          profile_description: campaign.profile_description,
          profile_status: campaign.profile_status,
          offer_text: campaign.offer_text,
          payment_link: campaign.payment_link,
          destination_type: campaign.destination_type,
        }
      };

      // Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `pirata_${campaignName.replace(/\s+/g, '_').toLowerCase()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      toast.success("Campanha exportada com sucesso!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(`Erro ao exportar campanha: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCampaign, isExporting };
}
