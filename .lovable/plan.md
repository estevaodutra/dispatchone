

## Diagnóstico: Lead sendo discado repetidamente

### Causa raiz

O ciclo é:

1. Ligação falha → `reschedule-failed-calls` cria um novo `call_logs` com `call_status = 'scheduled'` e `scheduled_for` no futuro
2. **Mas** na linha 151, seta o lead de volta para `status = 'pending'`
3. O `queue-executor` (tick) procura leads com `status = 'pending'` (linha 385-395)
4. Encontra o mesmo lead → cria **outro** `call_logs` com `ready` → disca imediatamente
5. Ligação falha → volta ao passo 1

O lead nunca sai do ciclo porque é setado para `pending` imediatamente, ignorando o `scheduled_for` do log agendado.

### Correção (2 arquivos)

**1. `supabase/functions/reschedule-failed-calls/index.ts` — linha 151**

Mudar o status do lead de `pending` para `scheduled` para que o queue-executor não o pegue novamente:

```typescript
// Antes:
.update({ status: "pending", assigned_operator_id: newOperatorId })

// Depois:
.update({ status: "scheduled", assigned_operator_id: newOperatorId })
```

**2. `supabase/functions/queue-executor/index.ts` — adicionar transição de scheduled→ready**

Antes de procurar leads `ready` ou `pending` (antes da linha 248), adicionar um passo que promove `call_logs` com `call_status = 'scheduled'` e `scheduled_for <= now()` para `ready`, e seta o lead correspondente de volta para `pending`:

```typescript
// Promote scheduled calls whose time has arrived
const { data: dueScheduled } = await supabase
  .from('call_logs')
  .select('id, lead_id')
  .eq('campaign_id', campaignId)
  .eq('call_status', 'scheduled')
  .lte('scheduled_for', new Date().toISOString())
  .limit(5);

if (dueScheduled?.length) {
  for (const sc of dueScheduled) {
    await supabase.from('call_logs').update({ call_status: 'ready' }).eq('id', sc.id);
    if (sc.lead_id) {
      await supabase.from('call_leads').update({ status: 'pending' }).eq('id', sc.lead_id);
    }
  }
}
```

Isso garante que:
- Leads reagendados ficam com status `scheduled` e **não** são pegos pelo queue-executor prematuramente
- Quando o horário agendado chega, o tick promove o log para `ready` e o lead para `pending`, permitindo a discagem normal

