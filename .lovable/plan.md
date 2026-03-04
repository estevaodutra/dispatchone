

## Problema

A fila combina itens de duas fontes (`call_queue` + `call_logs` com status scheduled/ready), mas as ações de exclusão só funcionam para a tabela `call_queue`. Os 283 itens mostrados são todos de `call_logs` (badge "Agendada"), então:

- O botão "Remover" não aparece para eles (só mostra badge)
- O "Limpar Fila" só limpa `call_queue` (que já está vazia)

## Correção

**Arquivo: `src/pages/CallPanel.tsx`**

### 1. Adicionar botão "Remover" nos itens de `call_logs`

Na linha ~1078, onde hoje só mostra badge "Agendada"/"Pronta", adicionar um DropdownMenu igual ao dos itens de `call_queue`, mas com ação de exclusão que cancela o `call_log` (update status → `cancelled`) em vez de deletar.

### 2. Handler para remover item de `call_logs`

Nova função `removeScheduledLog(logId: string)`:
- Remove o prefixo `cl_` do ID
- Faz `supabase.from('call_logs').update({ call_status: 'cancelled' }).eq('id', realId)`
- Invalida queries de queue

### 3. Atualizar "Limpar Fila" para incluir `call_logs`

Na ação de "Limpar Fila" (linha ~864), além de chamar `clearQueue(campaignFilter)`, também executar:
```typescript
supabase.from('call_logs')
  .update({ call_status: 'cancelled' })
  .in('call_status', ['scheduled', 'ready'])
  .eq('company_id', activeCompanyId)
```
Com filtro de campanha se aplicável.

### 4. Mover para início/final nos itens de `call_logs`

Adicionar as mesmas opções "Para o início" e "Para o final" ajustando o `scheduled_for` (como já descrito na memória `logica-reordenacao-fila`).

