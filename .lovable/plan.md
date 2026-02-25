

## Diagnóstico: Calls com status "AGORA!" (ready) não são discadas automaticamente

### Causa raiz

O loop global de ticks (`useQueueExecutionSummary` no `AppLayout`) só processa campanhas que possuem um `queue_execution_state` com status `running`, `waiting_operator` ou `waiting_cooldown`. 

Quando uma chamada é marcada como `ready` (AGORA!) — seja pela API `call-dial`, por agendamento, ou por retry — mas a campanha **não tem uma fila ativa**, nenhum tick é enviado e a chamada fica parada indefinidamente.

O mecanismo `bulkPollingActive` no `useCallPanel` resolve isso parcialmente, mas só funciona quando o CallPanel está montado E o polling foi ativado manualmente por um "Discar" em massa.

### Solução

Adicionar ao loop de manutenção global (`runMaintenance` no `useQueueExecutionSummary`) uma verificação de chamadas "ready" órfãs. Para cada campanha com calls `ready` sem fila ativa, o sistema deve:

1. Criar/ativar o `queue_execution_state` para essa campanha
2. Disparar um tick imediato

Isso garante que **qualquer call com status `ready` será processada automaticamente** sempre que houver um operador disponível, independentemente da página.

### Alterações

#### `src/hooks/useQueueExecution.ts` — Expandir `runMaintenance`

No callback `runMaintenance`, após resolver cooldowns e heal operators, adicionar:

```typescript
// Check for orphan "ready" call_logs without active queue
const { data: readyCalls } = await (supabase as any)
  .from("call_logs")
  .select("campaign_id")
  .eq("call_status", "ready");

if (readyCalls?.length) {
  const orphanCampaignIds = [...new Set(readyCalls.map((c: any) => c.campaign_id).filter(Boolean))];
  const activeCampaignIds = new Set(activeIdsRef.current);
  
  for (const cid of orphanCampaignIds) {
    if (activeCampaignIds.has(cid)) continue; // already being ticked
    
    // Ensure queue_execution_state exists and is running
    const { data: existing } = await (supabase as any)
      .from("queue_execution_state")
      .select("id, status")
      .eq("campaign_id", cid)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (existing) {
      if (!["running", "waiting_operator", "waiting_cooldown"].includes(existing.status)) {
        await (supabase as any)
          .from("queue_execution_state")
          .update({ status: "running" })
          .eq("id", existing.id);
      }
    } else if (user) {
      await (supabase as any)
        .from("queue_execution_state")
        .insert({
          campaign_id: cid,
          user_id: user.id,
          status: "running",
          session_started_at: new Date().toISOString(),
        });
    }

    // Trigger immediate tick
    try {
      await supabase.functions.invoke(
        `queue-executor?campaign_id=${cid}&action=tick`,
        { method: "POST" }
      );
    } catch (e) {
      console.error(`[maintenance] orphan-ready tick error for ${cid}:`, e);
    }
  }

  // Refresh state so next tick loop picks them up
  queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
}
```

Isso faz com que o loop de manutenção (que roda a cada 10s globalmente) detecte calls "AGORA!" órfãs e force a execução, garantindo que leads prioritários sejam discados imediatamente quando houver operador online.

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useQueueExecution.ts` | Expandir `runMaintenance` para detectar calls `ready` órfãs e ativar ticks automaticamente |

