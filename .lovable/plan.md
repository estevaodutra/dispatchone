

# Corrigir liberacao do operador e implementar cooldown

## Problema

No `call-status/index.ts` (linha 519), o operador so e liberado quando `mappedStatus === 'completed'`. Status terminais como `failed`, `busy`, `not_found`, `voicemail`, `cancelled`, `timeout` nao liberam o operador, deixando-o preso em `on_call` ate o self-healing do `queue-executor` detectar (proximo tick).

Alem disso, nenhuma parte do sistema implementa o cooldown: o operador volta direto para `available` e recebe uma nova chamada imediatamente, ignorando o `personal_interval_seconds`.

## Solucao

### Arquivo: `supabase/functions/call-status/index.ts`

**Mudanca 1 - Liberar operador em TODOS os status terminais (linhas 518-531):**

Substituir a condicao `mappedStatus === 'completed'` por uma lista de todos os status terminais:

```typescript
const TERMINAL_STATUSES = ['completed', 'failed', 'busy', 'not_found', 'voicemail', 'cancelled', 'timeout'];
if (TERMINAL_STATUSES.includes(mappedStatus) && callLog.operator_id) {
```

**Mudanca 2 - Implementar cooldown ao liberar o operador:**

Em vez de definir `status: 'available'` diretamente, verificar se o operador tem `personal_interval_seconds` configurado. Se sim, colocar em `cooldown`; se nao, usar o intervalo da campanha. Se nenhum intervalo existir, liberar como `available`.

```typescript
// Buscar operador para verificar personal_interval_seconds
const { data: operatorData } = await supabase
  .from('call_operators')
  .select('personal_interval_seconds')
  .eq('id', callLog.operator_id)
  .single();

// Buscar intervalo da campanha como fallback
let campaignInterval = 0;
if (callLog.campaign_id) {
  const { data: campData } = await supabase
    .from('call_campaigns')
    .select('queue_interval_seconds')
    .eq('id', callLog.campaign_id)
    .single();
  campaignInterval = campData?.queue_interval_seconds || 0;
}

const interval = operatorData?.personal_interval_seconds || campaignInterval;
const newStatus = interval > 0 ? 'cooldown' : 'available';

await supabase
  .from('call_operators')
  .update({
    status: newStatus,
    current_call_id: null,
    current_campaign_id: null,
    last_call_ended_at: new Date().toISOString(),
    total_calls: operatorData ? undefined : undefined, // mantido pelo queue-executor
  })
  .eq('id', callLog.operator_id)
  .eq('current_call_id', callLog.id);
```

O `queue-executor` ja tem a logica de transicionar cooldown -> available baseado em `last_call_ended_at + personal_interval_seconds`, entao essa mudanca completa o ciclo.

## Resumo

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/call-status/index.ts` | Liberar operador em todos os status terminais; implementar cooldown baseado no intervalo pessoal ou da campanha |

