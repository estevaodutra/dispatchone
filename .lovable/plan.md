
# Corrigir: Chamadas marcadas como "Discando" mas nunca executadas

## Problema

Tres bugs no `queue-executor` impedem chamadas de serem realmente discadas:

1. **Webhook nao disparado no path 3b**: Quando o motor processa leads pendentes (nao vindos do bulk enqueue), ele cria o call_log como 'dialing' mas nunca chama `fireDialWebhook`. A chamada fica "presa" em Discando para sempre porque o provedor nunca e notificado.

2. **Auto-cancelamento no path 3b**: O codigo insere um call_log com `dialing` + `operator_id`, e em seguida executa um UPDATE que cancela TODAS as chamadas ativas daquele operador - incluindo a que acabou de criar. Isso cria um ciclo: cria -> cancela -> operador liberado -> cria novamente.

3. **Campo `name` ausente na query da campanha**: O SELECT da campanha nao inclui `name`, mas o payload do webhook usa `campaign.name`, resultando em `undefined`.

## Solucao

### Arquivo: `supabase/functions/queue-executor/index.ts`

**Mudanca 1 - Incluir `name` no SELECT da campanha (linha 53):**

Adicionar `name` ao select: `'id, name, queue_execution_enabled, queue_interval_seconds, queue_unavailable_behavior'`

**Mudanca 2 - Reordenar path 3b (linhas 355-417):**

Mover o cancelamento de chamadas ativas para ANTES do insert do novo call_log, e adicionar exclusao do call recem-criado:
```
1. Cancelar chamadas ativas do operador
2. Inserir novo call_log com status 'dialing'
3. Atualizar operador para on_call
4. Atualizar lead status
5. Disparar webhook (ADICIONAR)
6. Atualizar queue state
```

**Mudanca 3 - Adicionar fireDialWebhook no path 3b:**

Apos atualizar o lead e antes de atualizar o queue state, chamar:
```typescript
await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, nextLead, operator);
```

## Detalhes Tecnicos

### Mudancas no arquivo `supabase/functions/queue-executor/index.ts`:

1. Linha 53: adicionar `name` ao select da campanha
2. Linhas 355-417: reordenar operacoes e adicionar webhook

Codigo corrigido do path 3b:
```typescript
// 4. Cancel active calls for this operator FIRST
await supabase
  .from('call_logs')
  .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
  .eq('operator_id', operator.id)
  .in('call_status', ['dialing', 'ringing', 'in_progress']);

// 5. Create call log
const { data: callLog, error: logErr } = await supabase
  .from('call_logs')
  .insert({
    user_id: userId,
    campaign_id: campaignId,
    lead_id: nextLead.id,
    operator_id: operator.id,
    call_status: 'dialing',
    scheduled_for: scheduledFor,
  })
  .select('id')
  .single();

// 6. Update operator, lead, fire webhook, update state
...
await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, nextLead, operator);
```

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/queue-executor/index.ts` | Adicionar `name` no select; reordenar cancel/insert no path 3b; adicionar fireDialWebhook no path 3b |
