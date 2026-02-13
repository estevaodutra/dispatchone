
# Corrigir Erro 500 nas Estatisticas de Webhook Events

## Problema

A tabela `webhook_events` tem **154.292 registros**. O hook `useWebhookEventStats` faz 5 consultas separadas:

1. `HEAD` com `count: "exact"` filtrando por `received_at >= hoje` (scan completo)
2. `HEAD` com `count: "exact"` filtrando por `classification = 'pending'` (scan completo)
3. `HEAD` com `count: "exact"` filtrando por `processing_status = 'failed'` (scan completo)
4. `HEAD` com `count: "exact"` filtrando por `processing_status = 'processed'` (scan completo)
5. `SELECT event_type` das ultimas 24h (pode retornar milhares de linhas)

Com 154k+ registros e sem indices otimizados, o PostgREST atinge timeout (erro 500).

## Solucao

### 1. Criar indices para as colunas filtradas

Adicionar indices na tabela `webhook_events` para as colunas usadas nos filtros:

```sql
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_classification ON webhook_events (classification);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status ON webhook_events (processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type_received ON webhook_events (event_type, received_at);
```

### 2. Otimizar as consultas no hook `useWebhookEventStats`

Alterar `src/hooks/useWebhookEvents.ts`:

- Trocar `count: "exact"` por `count: "estimated"` nas consultas que nao precisam de precisao absoluta (pending, failed, processed)
- Manter `count: "exact"` apenas para "today" (que tem escopo menor)
- Na consulta "byType" (ultimas 24h), usar `head: true` com agrupamento via RPC ou limitar o escopo para evitar retornar milhares de linhas
- Adicionar `staleTime` e `refetchInterval` maiores para nao repetir essas consultas pesadas a cada segundo

Mudancas especificas:

```typescript
// Pending - usar estimated
const { count: pendingCount } = await supabase
  .from("webhook_events")
  .select("*", { count: "estimated", head: true })
  .eq("classification", "pending");

// Failed - usar estimated  
const { count: failedCount } = await supabase
  .from("webhook_events")
  .select("*", { count: "estimated", head: true })
  .eq("processing_status", "failed");

// Processed - usar estimated
const { count: processedCount } = await supabase
  .from("webhook_events")
  .select("*", { count: "estimated", head: true })
  .eq("processing_status", "processed");
```

- Para a consulta "byType", limitar a 1000 registros para evitar timeout:

```typescript
const { data: byTypeData } = await supabase
  .from("webhook_events")
  .select("event_type")
  .gte("received_at", yesterday.toISOString())
  .limit(1000);
```

- Adicionar `staleTime: 60000` (1 minuto) para evitar re-fetches frequentes:

```typescript
return useQuery({
  queryKey: ["webhook-events-stats"],
  queryFn: async () => { ... },
  enabled: !!user,
  staleTime: 60_000,
  refetchInterval: 120_000,
});
```

### 3. Nenhuma mudanca na Edge Function

As Edge Functions nao sao afetadas.

## Resumo das alteracoes

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Criar 4 indices na tabela `webhook_events` |
| `src/hooks/useWebhookEvents.ts` | Trocar `exact` por `estimated` em 3 consultas, limitar byType a 1000, adicionar staleTime/refetchInterval |
