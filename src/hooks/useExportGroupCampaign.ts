import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useExportGroupCampaign() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setIsExporting(true);

      // 1. Fetch Campaign Info
      const { data: campaign, error: campaignError } = await supabase
        .from("group_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignError) throw campaignError;

      // 2. Fetch Sequences/Messages
      const { data: sequences, error: sequencesError } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_campaign_id", campaignId);
        
      if (sequencesError) throw sequencesError;

      // 3. Fetch Execution Lists
      const { data: executionLists, error: execError } = await supabase
        .from("group_execution_lists")
        .select("*")
        .eq("campaign_id", campaignId);
        
      if (execError) throw execError;

      // 4. Fetch Moderation Rules
      const { data: moderationRules, error: modError } = await supabase
        .from("group_moderation_rules")
        .select("*")
        .eq("group_campaign_id", campaignId);
        
      if (modError) throw modError;

      // Create export object
      const exportData = {
        version: "1.0",
        type: "group_campaign",
        campaign: {
          name: campaign.name,
          group_description: campaign.group_description,
          config: campaign.config,
          message_permission: campaign.message_permission,
          edit_permission: campaign.edit_permission
        },
        sequences: sequences.map(s => {
          // Exclude ids and relations to prevent conflicts on import
          const { id, group_campaign_id, user_id, created_at, ...rest } = s;
          return { _original_id: id, ...rest };
        }),
        execution_lists: executionLists.map(l => {
          // Exclude ids and state data
          const { id, campaign_id, user_id, created_at, updated_at, last_executed_at, current_cycle_id, ...rest } = l;
          return { _original_id: id, ...rest };
        }),
        moderation_rules: moderationRules.map(r => {
          const { id, group_campaign_id, user_id, created_at, ...rest } = r;
          return { _original_id: id, ...rest };
        })
      };

      // Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `campanha_${campaignName.replace(/\s+/g, '_').toLowerCase()}.json`);
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
