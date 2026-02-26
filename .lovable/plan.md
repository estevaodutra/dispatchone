

## Diagnóstico

Os dados confirmam o problema: **399 call_logs com status `dialing` e `operator_id = NULL`**. O lote anterior de ~200 leads foi processado pela versão ANTIGA do `call-dial` (antes do fix), que acionava o webhook para TODOS os leads independente de ter operador reservado. O n8n recebeu todos, começou a discar todos, e chamou de volta o `call-status` atualizando tudo para `dialing`.

Existe ainda uma segunda vulnerabilidade: o endpoint `call-status` aceita atualizações de status (ex: `dialing`) mesmo quando o `call_log` não tem `operator_id` atribuído, permitindo que callbacks externos forcem um status inconsistente.

## Plano

### Passo 1: Limpar dados atuais (SQL migration)

Reverter os 399 registros travados em `dialing` sem operador para `scheduled`, e os leads correspondentes para `pending`:

```sql
-- Reverter call_logs 'dialing' sem operador para 'scheduled'
UPDATE call_logs 
SET call_status = 'scheduled', started_at = NULL
WHERE call_status = 'dialing' AND operator_id IS NULL;

-- Reverter call_leads associados para 'pending'
UPDATE call_leads 
SET status = 'pending', assigned_operator_id = NULL
WHERE id IN (
  SELECT DISTINCT lead_id FROM call_logs 
  WHERE call_status = 'scheduled' AND operator_id IS NULL
);
```

### Passo 2: Proteger `call-status` contra atualizações sem operador

Em `supabase/functions/call-status/index.ts`, adicionar uma guarda: quando o status recebido for `dialing` ou `ringing`, verificar se o `call_log` tem um `operator_id`. Se nao tiver, rejeitar a atualização (ou ignorar silenciosamente) em vez de forçar o status para `dialing`.

Trecho a modificar (~linhas 460-465):
```typescript
// Guard: don't accept dialing/ringing without operator
if (['dialing', 'ringing'].includes(mappedStatus) && !callLog.operator_id) {
  // Allow only if call was created by this same request (isCreated)
  if (!isCreated) {
    console.log('[call-status] Ignoring dialing/ringing update: call has no operator assigned');
    // Don't update - return success silently
    // (the lead stays scheduled for proper queue processing)
  }
}
```

### Arquivos alterados
- **SQL migration** -- limpar 399 registros stuck
- `supabase/functions/call-status/index.ts` -- guarda contra status sem operador

