

## Problema

O `queue-executor` (edge function que processa a fila de discagem) **nunca consulta a tabela `call_queue`**. Ele seleciona leads de duas fontes:

1. `call_logs` com `call_status = 'ready'` (ordenado por `scheduled_for`)
2. `call_leads` com `status = 'pending'` (ordenado por `created_at`)

A tabela `call_queue` e sua ordenação por `position` são completamente ignoradas. Isso significa que mover leads "para o início" ou "para o final" na aba Fila não tem efeito na ordem real de discagem.

## Solução

Modificar o `queue-executor` para consultar a tabela `call_queue` **antes** das outras fontes. Se existirem entradas `waiting` na `call_queue`, usar a ordem de `position` para determinar o próximo lead a discar.

### Alterações

**1. `supabase/functions/queue-executor/index.ts`** — Adicionar etapa 3a-pre: consultar `call_queue`

Entre a resolução de cooldowns (etapa 2) e a busca de `call_logs` ready (etapa 3a), inserir:

```
// 3-pre. Check call_queue table for position-ordered entries
const { data: queueEntry } = await supabase
  .from('call_queue')
  .select('id, lead_id, campaign_id')
  .eq('campaign_id', campaignId)
  .eq('status', 'waiting')
  .order('position', { ascending: true })
  .limit(1)
  .maybeSingle();
```

Se encontrar uma entrada:
- Buscar dados do lead em `call_leads`
- Criar `call_log` com status `ready`
- Reservar operador via RPC
- Disparar webhook
- **Remover a entrada da `call_queue`** após discar com sucesso (ou marcar como `processing`)
- Atualizar `queue_execution_state`

Isso garante que leads na `call_queue` (com posição manual) sejam processados **antes** dos `call_logs` ready genéricos, respeitando a ordenação por `position`.

**2. Manter fallback existente** — Se a `call_queue` estiver vazia, o fluxo continua como hoje (call_logs ready → call_leads pending).

### Fluxo resultante

```text
Tick →
  1. Heal stuck operators
  2. Resolve cooldowns  
  3. Check call_queue (ordered by position) ← NOVO
  4. Check call_logs ready (ordered by scheduled_for)
  5. Check call_leads pending (ordered by created_at)
```

### Detalhes técnicos

- Ao consumir uma entrada da `call_queue`, remover o registro (`DELETE FROM call_queue WHERE id = ?`) para evitar processamento duplicado
- Atualizar o status do lead em `call_leads` para `calling`
- O lead na `call_queue` referencia `lead_id` que aponta para `call_leads`, de onde se obtém `phone` e `name`

