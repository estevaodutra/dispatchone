import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useExportDispatchCampaign() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setIsExporting(true);

      // 1. Fetch Campaign Info
      const { data: campaign, error: campaignError } = await supabase
        .from("dispatch_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignError) throw campaignError;

      // 2. Fetch Sequences
      const { data: sequences, error: sequencesError } = await supabase
        .from("dispatch_sequences")
        .select("*")
        .eq("campaign_id", campaignId);
        
      if (sequencesError) throw sequencesError;

      // 3. Fetch Sequence Steps
      const sequenceIds = sequences.map(s => s.id);
      let steps: any[] = [];
      
      if (sequenceIds.length > 0) {
        const { data: fetchedSteps, error: stepsError } = await supabase
          .from("dispatch_sequence_steps")
          .select("*")
          .in("sequence_id", sequenceIds);
          
        if (stepsError) throw stepsError;
        steps = fetchedSteps || [];
      }

      // Create export object
      const exportData = {
        version: "1.0",
        type: "dispatch_campaign",
        campaign: {
          name: campaign.name,
          description: campaign.description,
          use_exclusive_instance: campaign.use_exclusive_instance
        },
        sequences: sequences.map(s => {
          const { id, campaign_id, user_id, created_at, updated_at, ...rest } = s;
          return { _original_id: id, ...rest };
        }),
        steps: steps.map(s => {
          const { id, user_id, created_at, updated_at, ...rest } = s;
          return { _original_id: id, ...rest };
        })
      };

      // Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `despacho_${campaignName.replace(/\s+/g, '_').toLowerCase()}.json`);
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
