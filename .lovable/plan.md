

## Plano: Corrigir ação "Adicionar a uma Lista" para usar a lista correta

### Problema
A ação `add_to_list` no `handle-poll-response` ignora o `listId` configurado na enquete. Em vez de adicionar o lead à lista de destino escolhida, ela busca qualquer lista ativa da campanha (linha 625-632). Resultado: um lead de `poll_response` cai numa lista que monitora `group_leave`.

### Alteração

**`supabase/functions/handle-poll-response/index.ts`** — case `add_to_list` (~linha 619-670):

1. Ler `listId` da config: `const targetListId = actionConfig.config.listId as string | undefined;`
2. Se `targetListId` existir, buscar diretamente por `id` em vez de buscar qualquer lista ativa:
   ```typescript
   let query = supabase
     .from("group_execution_lists")
     .select("id, current_cycle_id, user_id")
     .eq("is_active", true)
     .gt("current_window_end", new Date().toISOString());

   if (targetListId) {
     query = query.eq("id", targetListId);
   } else {
     query = query.eq("campaign_id", targetCampaignId);
   }

   const { data: activeList } = await query.limit(1).maybeSingle();
   ```
3. Manter o restante do fluxo (upsert) inalterado.

### Arquivos
- `supabase/functions/handle-poll-response/index.ts`

