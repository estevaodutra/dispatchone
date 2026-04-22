import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface SchedulingAttendant {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  bio: string | null;
  photoUrl: string | null;
  callOperatorId: string | null;
  linkedUserId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DbAttendant {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  call_operator_id: string | null;
  linked_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

const transform = (d: DbAttendant): SchedulingAttendant => ({
  id: d.id,
  companyId: d.company_id,
  name: d.name,
  email: d.email,
  bio: d.bio,
  photoUrl: d.photo_url,
  callOperatorId: d.call_operator_id,
  linkedUserId: d.linked_user_id,
  isActive: d.is_active,
  createdAt: d.created_at,
});

export function useAttendants() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  const { data: attendants = [], isLoading } = useQuery({
    queryKey: ["scheduling_attendants", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await (supabase as any)
        .from("scheduling_attendants")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data as DbAttendant[]).map(transform);
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; email?: string; bio?: string; photoUrl?: string }) => {
      if (!user || !activeCompanyId) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("scheduling_attendants")
        .insert({
          company_id: activeCompanyId,
          user_id: user.id,
          name: input.name,
          email: input.email ?? null,
          bio: input.bio ?? null,
          photo_url: input.photoUrl ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbAttendant);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_attendants"] });
      toast({ title: "Atendente criado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar atendente", description: e.message, variant: "destructive" });
    },
  });

  return { attendants, isLoading, create };
}
