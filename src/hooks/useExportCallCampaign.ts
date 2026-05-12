import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useExportCallCampaign() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setIsExporting(true);

      // 1. Fetch Campaign Info
      const { data: campaign, error: campaignError } = await supabase
        .from("call_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignError) throw campaignError;

      // 2. Fetch Scripts
      const { data: scripts, error: scriptsError } = await supabase
        .from("call_scripts")
        .select("*")
        .eq("campaign_id", campaignId);
        
      if (scriptsError) throw scriptsError;

      // 3. Fetch Script Actions
      const { data: actions, error: actionsError } = await supabase
        .from("call_script_actions")
        .select("*")
        .eq("campaign_id", campaignId);
        
      if (actionsError) throw actionsError;

      // Create export object
      const exportData = {
        version: "1.0",
        type: "call_campaign",
        campaign: {
          name: campaign.name,
          description: campaign.description,
          api4com_config: campaign.api4com_config,
          dial_delay_minutes: campaign.dial_delay_minutes,
          is_priority: campaign.is_priority,
          priority_position: campaign.priority_position,
          queue_execution_enabled: campaign.queue_execution_enabled,
          queue_interval_seconds: campaign.queue_interval_seconds,
          queue_unavailable_behavior: campaign.queue_unavailable_behavior,
          retry_count: campaign.retry_count,
          retry_interval_minutes: campaign.retry_interval_minutes,
          retry_exceeded_behavior: campaign.retry_exceeded_behavior
        },
        scripts: scripts.map(s => {
          const { id, campaign_id, user_id, created_at, updated_at, ...rest } = s;
          return { _original_id: id, ...rest };
        }),
        actions: actions.map(a => {
          const { id, campaign_id, user_id, created_at, ...rest } = a;
          return { _original_id: id, ...rest };
        })
      };

      // Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `ligacao_${campaignName.replace(/\s+/g, '_').toLowerCase()}.json`);
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
