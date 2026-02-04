import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CallOperator {
  id: string;
  campaignId: string;
  operatorName: string;
  extension: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DbCallOperator {
  id: string;
  campaign_id: string;
  user_id: string;
  operator_name: string;
  extension: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const transformDbToFrontend = (db: DbCallOperator): CallOperator => ({
  id: db.id,
  campaignId: db.campaign_id,
  operatorName: db.operator_name,
  extension: db.extension,
  isActive: db.is_active ?? true,
  createdAt: db.created_at || new Date().toISOString(),
});

export function useCallOperators(campaignId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: operators = [], isLoading, refetch } = useQuery({
    queryKey: ["call_operators", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_campaign_operators")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as DbCallOperator[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const addOperatorMutation = useMutation({
    mutationFn: async (operator: { operatorName: string; extension?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("call_campaign_operators")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          operator_name: operator.operatorName,
          extension: operator.extension || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbCallOperator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators", campaignId] });
      toast({ title: "Operador adicionado", description: "Operador adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateOperatorMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{ operatorName: string; extension: string; isActive: boolean }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.operatorName !== undefined) dbUpdates.operator_name = updates.operatorName;
      if (updates.extension !== undefined) dbUpdates.extension = updates.extension;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await (supabase as any)
        .from("call_campaign_operators")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeOperatorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("call_campaign_operators")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators", campaignId] });
      toast({ title: "Removido", description: "Operador removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("call_campaign_operators")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_operators", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    operators,
    isLoading,
    refetch,
    addOperator: addOperatorMutation.mutateAsync,
    updateOperator: updateOperatorMutation.mutateAsync,
    removeOperator: removeOperatorMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isAdding: addOperatorMutation.isPending,
  };
}
