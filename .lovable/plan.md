

# Corrigir chamadas canceladas que voltam como "AGORA"

## Causa Raiz

Quando o usuario cancela uma chamada no painel, o sistema faz duas coisas:
1. Define `call_status = 'cancelled'` no `call_logs` -- correto
2. Define `status = 'pending'` no `call_leads` -- **este e o problema**

O motor de fila (`queue-executor`) roda a cada 15 segundos e busca leads com `status = 'pending'` para criar novas chamadas. Resultado: o lead cancelado volta instantaneamente ao painel com uma nova chamada "AGORA!".

```text
Cancelar chamada
    |
    v
call_logs.call_status = 'cancelled'
call_leads.status = 'pending'      <-- Lead fica "disponivel"
    |
    v (15 segundos depois)
queue-executor encontra lead 'pending'
    |
    v
Cria NOVO call_log com status 'dialing' --> "AGORA!" volta ao painel
```

## Solucao

### 1. Novo status "cancelled" para call_leads

Adicionar `'cancelled'` como status valido para leads. Quando o usuario cancela uma chamada, o lead deve ir para `cancelled` em vez de `pending`.

### 2. Corrigir cancelCallMutation (useCallPanel.ts)

Alterar a mutacao de cancelamento para definir `call_leads.status = 'cancelled'` em vez de `'pending'`.

### 3. Corrigir cancelamento em massa (useCallPanel.ts)

A acao de cancelamento em massa (bulk cancel) tambem deve definir os leads associados como `cancelled`.

### 4. Corrigir a acao "Reverter para Agora!" (useCallPanel.ts)

A acao de reverter chamadas travadas (`revertToReady`) ja funciona corretamente porque define o lead como `pending` intencionalmente -- o usuario QUER que a chamada seja retentada.

### 5. Atualizar o tipo CallLeadStatus (useCallLeads.ts)

Adicionar `'cancelled'` ao tipo `CallLeadStatus` para que o frontend reconheca o novo status.

### 6. Atualizar labels/cores no LeadsTab

Adicionar label e cor para o status `cancelled` na aba de leads da campanha.

## Arquivos Modificados

1. **`src/hooks/useCallPanel.ts`** -- Alterar `cancelCallMutation` para usar `status: 'cancelled'` no lead
2. **`src/hooks/useCallLeads.ts`** -- Adicionar `'cancelled'` ao tipo `CallLeadStatus`
3. **`src/components/call-campaigns/tabs/LeadsTab.tsx`** -- Adicionar label/cor para status `cancelled`

## Detalhes Tecnicos

Nenhuma migracao de banco e necessaria. A coluna `status` em `call_leads` e do tipo `text`, portanto aceita qualquer valor. O `queue-executor` ja filtra apenas por `status = 'pending'`, entao leads com `status = 'cancelled'` serao automaticamente ignorados.

A mudanca e cirurgica: apenas a linha que define `status: "pending"` no cancelamento passa a usar `status: "cancelled"`. Nenhum outro fluxo e afetado.

