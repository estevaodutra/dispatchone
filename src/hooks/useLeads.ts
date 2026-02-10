import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lead {
  id: string;
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  tags: string[];
  custom_fields: Record<string, string | number | boolean | null>;
  active_campaign_id: string | null;
  active_campaign_type: string | null;
  total_calls: number;
  total_messages: number;
  last_contact_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  search?: string;
  tags?: string[];
  status?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface LeadStats {
  total: number;
  active: number;
  inCampaign: number;
  inactive: number;
}

const PAGE_SIZE = 20;

export function useLeads(filters: LeadFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? PAGE_SIZE;

  const leadsQuery = useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }
      if (filters.campaignId) {
        query = query.eq("active_campaign_id", filters.campaignId);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as Lead[], count: count || 0 };
    },
  });

  const statsQuery = useQuery({
    queryKey: ["leads-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("leads").select("*", { count: "exact", head: true });
      const { count: active } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: inCampaign } = await supabase.from("leads").select("*", { count: "exact", head: true }).not("active_campaign_id", "is", null);
      const { count: inactive } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "inactive");
      return {
        total: total || 0,
        active: active || 0,
        inCampaign: inCampaign || 0,
        inactive: inactive || 0,
      } as LeadStats;
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: { name?: string; phone: string; email?: string; tags?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("leads").insert({
        user_id: user.id,
        name: lead.name || null,
        phone: lead.phone,
        email: lead.email || null,
        tags: lead.tags || [],
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead criado com sucesso" });
    },
    onError: (err: Error) => {
      const msg = err.message.includes("duplicate") ? "Já existe um lead com este telefone" : err.message;
      toast({ title: "Erro ao criar lead", description: msg, variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar lead", variant: "destructive" }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir lead", variant: "destructive" }),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads excluídos" });
    },
    onError: () => toast({ title: "Erro ao excluir leads", variant: "destructive" }),
  });

  const bulkAddTags = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      // Fetch current leads to merge tags
      const { data: currentLeads, error: fetchErr } = await supabase.from("leads").select("id, tags").in("id", ids);
      if (fetchErr) throw fetchErr;
      for (const lead of currentLeads || []) {
        const merged = Array.from(new Set([...(lead.tags || []), ...tags]));
        await supabase.from("leads").update({ tags: merged }).eq("id", lead.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Tags adicionadas" });
    },
    onError: () => toast({ title: "Erro ao adicionar tags", variant: "destructive" }),
  });

  const importLeads = useMutation({
    mutationFn: async ({ leads, updateExisting, defaultTags, defaultCampaignId, defaultCampaignType }: {
      leads: { name?: string; phone: string; email?: string; tags?: string[]; campaignId?: string; campaignType?: string }[];
      updateExisting: boolean;
      defaultTags: string[];
      defaultCampaignId?: string;
      defaultCampaignType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const lead of leads) {
        const tags = Array.from(new Set([...(lead.tags || []), ...defaultTags]));
        const campaignId = lead.campaignId || defaultCampaignId || null;
        const campaignType = lead.campaignType || defaultCampaignType || null;

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          name: lead.name || null,
          phone: lead.phone,
          email: lead.email || null,
          tags,
        };
        if (campaignId) {
          insertData.active_campaign_id = campaignId;
          insertData.active_campaign_type = campaignType;
        }

        const { error } = await supabase.from("leads").insert(insertData as any);

        if (error) {
          if (error.message.includes("duplicate") && updateExisting) {
            const updateData: Record<string, unknown> = {
              name: lead.name || undefined,
              email: lead.email || undefined,
              tags,
            };
            if (campaignId) {
              updateData.active_campaign_id = campaignId;
              updateData.active_campaign_type = campaignType;
            }
            await supabase.from("leads").update(updateData as any).eq("phone", lead.phone).eq("user_id", user.id);
            updated++;
          } else {
            skipped++;
          }
        } else {
          imported++;
        }
      }
      return { imported, updated, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Importação concluída", description: `${result.imported} importados, ${result.updated} atualizados, ${result.skipped} ignorados` });
    },
    onError: () => toast({ title: "Erro na importação", variant: "destructive" }),
  });

  return {
    leads: leadsQuery.data?.data || [],
    totalCount: leadsQuery.data?.count || 0,
    stats: statsQuery.data || { total: 0, active: 0, inCampaign: 0, inactive: 0 },
    isLoading: leadsQuery.isLoading,
    createLead,
    updateLead,
    deleteLead,
    bulkDelete,
    bulkAddTags,
    importLeads,
    pageSize: limit,
  };
}
