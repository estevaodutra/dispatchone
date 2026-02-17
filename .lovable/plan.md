
# Tratar resposta "operator_unavailable" do webhook

## Problema

Quando o provedor externo retorna `"message": "operator_unavailable"` na resposta do webhook de discagem, o sistema ignora essa informacao e deixa a chamada em status "dialing" com o operador travado em "on_call". A chamada deveria voltar para a fila para ser tentada novamente quando houver operador disponivel.

## Solucao

### Arquivo: `supabase/functions/queue-executor/index.ts` -- funcao `fireDialWebhook`

Apos parsear a resposta do webhook (linha ~480), adicionar deteccao do `message: "operator_unavailable"`. Quando detectado:

1. Reverter o `call_log` para status `ready` (volta para a fila de prontos)
2. Liberar o operador de volta para `available` (limpar `current_call_id` e `current_campaign_id`)
3. Reverter o lead para status `pending`
4. Retornar um flag indicando que houve falha de operador

Logica a ser adicionada no bloco de parse da resposta:

```typescript
try {
  const parsed = JSON.parse(responseText);
  if (Array.isArray(parsed) && parsed[0]?.id) {
    // Detectar operator_unavailable
    if (parsed[0]?.message === 'operator_unavailable') {
      console.log('[queue-executor] Operator unavailable response, reverting call to queue');
      
      // Reverter call_log para ready (volta para fila)
      await supabase
        .from('call_logs')
        .update({ call_status: 'ready', started_at: null, operator_id: null })
        .eq('id', callLogId);
      
      // Liberar operador
      await supabase
        .from('call_operators')
        .update({ status: 'available', current_call_id: null, current_campaign_id: null })
        .eq('id', operator.id);
      
      // Reverter lead para pending
      if (lead?.id) {
        await supabase
          .from('call_leads')
          .update({ status: 'pending', assigned_operator_id: null })
          .eq('id', lead.id);
      }
      return;
    }
    
    // Fluxo normal: armazenar external_call_id
    await supabase
      .from('call_logs')
      .update({ external_call_id: parsed[0].id })
      .eq('id', callLogId);
    console.log('[queue-executor] Stored external_call_id:', parsed[0].id);
  }
} catch {
  // Response not JSON, ignore
}
```

Isso garante que:
- A chamada volta como `ready` para ser processada no proximo tick
- O operador e liberado imediatamente para receber outras chamadas
- O lead volta para `pending` e pode ser atribuido novamente
- Nenhuma mudanca de banco de dados e necessaria
