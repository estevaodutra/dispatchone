
# Corrigir: Operador preso em "on_call" com chamada ja finalizada

## Problema

O operador "Estevao" esta com status `on_call` vinculado a uma chamada com status `voicemail_rescheduled`. O self-healing do `queue-executor` so libera operadores cujas chamadas estejam em uma lista fixa de status finais (`ready`, `cancelled`, `completed`, `failed`, `no_answer`, `busy`). Varios status terminais nao estao nessa lista:

- `voicemail_rescheduled`
- `timeout_rescheduled`
- `failed_rescheduled`
- `not_found_rescheduled`
- `ended`
- `scheduled`
- `waiting_operator`

Resultado: o operador fica permanentemente travado como "ocupado" e o sistema mostra "0 disponíveis".

## Solucao

Inverter a logica do self-healing: em vez de listar todos os status "finalizados" (whitelist), listar apenas os status que significam "chamada realmente ativa" (blacklist). Se o status da chamada NAO estiver entre os ativos, o operador e liberado.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/queue-executor/index.ts`

**Linha 168 - Inverter a logica:**

Antes:
```typescript
if (!callLog || ['ready', 'cancelled', 'completed', 'failed', 'no_answer', 'busy'].includes(callLog.call_status)) {
```

Depois:
```typescript
const activeStatuses = ['dialing', 'ringing', 'in_progress'];
if (!callLog || !activeStatuses.includes(callLog.call_status)) {
```

Isso cobre automaticamente qualquer status terminal atual e futuro, sem necessidade de manter uma whitelist crescente.

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/queue-executor/index.ts` | Inverter logica de self-healing: liberar operador se chamada NAO estiver em status ativo |
