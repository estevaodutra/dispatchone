

## Diagnóstico

O status `cancelled` **não está incluído** nas listas de retry em dois lugares:

1. **`supabase/functions/call-status/index.ts` (linha 584)**: `FAILURE_STATUSES` não inclui `cancelled` — quando o provedor envia `cancelled`, o retry não é acionado.
2. **`supabase/functions/reschedule-failed-calls/index.ts` (linha 20-27)**: `failedStatuses` não inclui `cancelled` — o cron de 30min também ignora chamadas canceladas.

Além disso, na linha 573-574 do `call-status`, `cancelled` marca o lead como `failed` em vez de `pending`, impedindo retentativas.

## Alterações

### 1. `supabase/functions/call-status/index.ts`
- **Linha 584**: Adicionar `'cancelled'` ao array `FAILURE_STATUSES`
- **Linha 573**: Mover `'cancelled'` do grupo que marca lead como `failed` para o grupo que marca como `pending` (junto com `no_answer`/`voicemail`)

### 2. `supabase/functions/reschedule-failed-calls/index.ts`
- **Linha 20-27**: Adicionar `'cancelled'` ao array `failedStatuses`

Resultado: chamadas canceladas pelo provedor seguirão a mesma lógica de retentativa das demais falhas, respeitando `retry_count`, `retry_interval_minutes` e `retry_exceeded_behavior` da campanha.

