

## Problema

A rotina de manutenção (`runMaintenance`) no hook `useQueueExecutionSummary` (linhas 160-209) possui uma lógica de "orphan-ready" que **força a fila de volta para "running"** sempre que encontra `call_logs` com status `ready` em uma campanha cuja fila não está ativa.

Trecho problemático (linhas 180-186):
```typescript
if (existing) {
  if (!["running", "waiting_operator", "waiting_cooldown"].includes(existing.status)) {
    // Força para "running" mesmo que esteja "stopped" ou "paused"
    await supabase.from("queue_execution_state")
      .update({ status: "running" })
      .eq("id", existing.id);
  }
}
```

Se o gestor para a fila manualmente (status = `stopped` ou `paused`), e ainda existem `call_logs` com status `ready`, a manutenção roda a cada 10 segundos e reativa a fila automaticamente — ignorando a decisão do operador.

## Solução

Alterar a condição para **respeitar os status manuais** (`stopped` e `paused`). A lógica de orphan-ready só deve reativar filas que estejam em um estado inconsistente real — ou seja, filas que **não existem** na tabela `queue_execution_state`. Se a fila existe mas está parada ou pausada, é decisão intencional do usuário.

### `src/hooks/useQueueExecution.ts` — linhas 160-209

Remover a reativação automática quando o status é `stopped` ou `paused`. Manter apenas o envio de tick para filas que já estão ativas (running/waiting) mas não estão na lista local `activeIdsRef` (edge case de dessincronização do cache):

```typescript
// Check for orphan "ready" call_logs without active queue
const { data: readyCalls } = await (supabase as any)
  .from("call_logs")
  .select("campaign_id")
  .eq("call_status", "ready");

if (readyCalls?.length) {
  const orphanCampaignIds = [...new Set(readyCalls.map((c: any) => c.campaign_id).filter(Boolean))] as string[];
  const activeCampaignIds = new Set(activeIdsRef.current);

  for (const cid of orphanCampaignIds) {
    if (activeCampaignIds.has(cid)) continue;

    const { data: existing } = await (supabase as any)
      .from("queue_execution_state")
      .select("id, status")
      .eq("campaign_id", cid)
      .maybeSingle();

    // Respect manual stops/pauses — do NOT reactivate
    if (existing && ["stopped", "paused"].includes(existing.status)) {
      continue;
    }

    // Only act on queues that are already in an active state
    // but weren't picked up by the local cache yet
    if (existing && ["running", "waiting_operator", "waiting_cooldown"].includes(existing.status)) {
      try {
        await supabase.functions.invoke(
          `queue-executor?campaign_id=${cid}&action=tick`,
          { method: "POST" }
        );
        console.log(`[maintenance] orphan-ready tick sent for campaign ${cid}`);
      } catch (e) {
        console.error(`[maintenance] orphan-ready tick error for ${cid}:`, e);
      }
    }
    // If no existing state at all and there are ready calls,
    // do NOT auto-create — user must start the queue manually
  }

  queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
}
```

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useQueueExecution.ts` | Remover reativação automática de filas paradas/pausadas na rotina de orphan-ready (linhas 160-209) |

