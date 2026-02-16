

# Enfileiramento em Massa por Status na Aba de Leads

## O que sera feito

Adicionar um botao "Discar todos" na aba de Leads da campanha que enfileira automaticamente todos os leads com o status filtrado (ex: "Pendente", "Nao atendeu", etc.) para discagem pelo motor de fila. Quando nenhum filtro esta ativo, o botao atuara sobre todos os leads com status "pending".

## Como vai funcionar

1. O usuario seleciona um filtro de status (ex: "Pendente")
2. Clica no botao "Discar todos pendentes"
3. O sistema cria registros `call_logs` com status `ready` para cada lead filtrado
4. Garante que a fila da campanha esteja ativa (`running`)
5. O motor de execucao em fila processa as chamadas automaticamente

## Detalhes Tecnicos

### Arquivo: `src/hooks/useCallLeads.ts`

Adicionar uma nova mutation `bulkEnqueueByStatus` que:

1. Busca todos os leads da campanha com o status especificado
2. Para cada lead, cria um `call_log` com status `ready` e `scheduled_for = now()` (usando upsert para evitar duplicatas de chamadas ativas)
3. Garante que o `queue_execution_state` esteja em `running`
4. Dispara um tick imediato do `queue-executor`

```typescript
const bulkEnqueueByStatusMutation = useMutation({
  mutationFn: async ({ status }: { status: CallLeadStatus }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nao autenticado");

    // Buscar leads com o status filtrado
    const { data: matchingLeads, error: fetchErr } = await (supabase as any)
      .from("call_leads")
      .select("id, phone, name")
      .eq("campaign_id", campaignId)
      .eq("status", status);

    if (fetchErr) throw fetchErr;
    if (!matchingLeads?.length) throw new Error("Nenhum lead encontrado com esse status");

    const now = new Date().toISOString();

    // Criar call_logs com status 'ready' para cada lead
    // Verificar quais ja tem chamada ativa
    for (const lead of matchingLeads) {
      const { data: existing } = await (supabase as any)
        .from("call_logs")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("lead_id", lead.id)
        .in("call_status", ["scheduled", "ready", "dialing", "ringing", "in_progress"])
        .maybeSingle();

      if (existing) {
        // Atualizar para ready
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "ready", scheduled_for: now, operator_id: null })
          .eq("id", existing.id);
      } else {
        // Criar novo
        await (supabase as any)
          .from("call_logs")
          .insert({
            user_id: user.id,
            campaign_id: campaignId,
            lead_id: lead.id,
            call_status: "ready",
            scheduled_for: now,
          });
      }
    }

    // Garantir fila ativa
    const { data: queueState } = await (supabase as any)
      .from("queue_execution_state")
      .select("id, status")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (queueState) {
      if (queueState.status !== "running") {
        await (supabase as any)
          .from("queue_execution_state")
          .update({ status: "running", updated_at: now })
          .eq("id", queueState.id);
      }
    } else {
      await (supabase as any)
        .from("queue_execution_state")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          status: "running",
          current_operator_index: 0,
          session_started_at: now,
        });
    }

    // Tick imediato
    await supabase.functions.invoke(
      `queue-executor?campaign_id=${campaignId}&action=tick`,
      { method: "POST" }
    );

    return matchingLeads.length;
  },
  onSuccess/onError handlers...
});
```

### Arquivo: `src/components/call-campaigns/tabs/LeadsTab.tsx`

Adicionar botao "Discar todos" ao lado do botao "Adicionar Lead":

- O texto do botao muda conforme o filtro ativo: "Discar todos pendentes", "Discar todos que nao atenderam", etc.
- Mostra um dialog de confirmacao com a contagem de leads antes de executar
- Desabilitado se nao houver leads com o status filtrado

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useCallLeads.ts` | Nova mutation `bulkEnqueueByStatus` para enfileirar leads por status |
| `src/components/call-campaigns/tabs/LeadsTab.tsx` | Botao "Discar todos" com dialog de confirmacao |

