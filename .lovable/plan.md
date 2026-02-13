

# Corrigir Dual Logging na Edge Function

## Problema

O insert em `group_message_logs` dentro da Edge Function `execute-dispatch-sequence` falha silenciosamente. O Supabase JS client nao lanca excecoes - retorna `{ data, error }`. O codigo atual usa `.then(() => {}).catch(...)`, o que descarta o erro retornado no objeto de resposta e so capturaria erros de rede (que nao estao ocorrendo).

## Causa Raiz

```typescript
// Codigo atual (linhas 387-403)
supabase.from("group_message_logs").insert({...})
  .then(() => {})  // descarta { data, error } - o error nunca e verificado
  .catch((e) => console.warn(...))  // so captura erros de rede
```

## Solucao

Corrigir o dual logging para verificar e logar o `error` retornado pelo Supabase client. Isso vai:
1. Revelar o erro real (provavelmente RLS ou alguma constraint)
2. Permitir debugar e corrigir a causa

### Alteracao em `supabase/functions/execute-dispatch-sequence/index.ts`

Substituir os dois blocos de `Promise.all` (linhas 377-404 e 418-443) para usar `await` com verificacao de erro:

**Bloco de sucesso (linhas 377-404):**
```typescript
await Promise.all([
  supabase.from("dispatch_sequence_logs").insert({
    user_id: userId,
    sequence_id: sequenceId,
    step_id: step.id,
    contact_id: contactId || null,
    status: logStatus,
    sent_at: now,
    error_message: logError,
  }),
  (async () => {
    const { error: gmlError } = await supabase.from("group_message_logs").insert({
      group_campaign_id: campaignId,
      user_id: userId,
      recipient_phone: contactPhone,
      status: logStatus,
      sent_at: now,
      sequence_id: sequenceId,
      node_type: step.message_type || "text",
      node_order: step.step_order,
      campaign_name: typedCampaign.name,
      group_name: contactName || "",
      instance_name: instance.name,
      instance_id: instance.id,
      error_message: logError,
      response_time_ms: responseTimeMs,
      payload: payload as unknown,
    });
    if (gmlError) {
      console.error("[DispatchSequence] group_message_logs insert FAILED:", JSON.stringify(gmlError));
    }
  })(),
]);
```

**Bloco de erro (linhas 418-443):** Mesma correao - substituir `.then(() => {}).catch(...)` por verificacao explicita de `error`.

Esta correcao vai:
- Revelar o erro real do insert em `group_message_logs` nos logs da Edge Function
- Permitir identificar se o problema e RLS, constraint ou outro
- Manter o fluxo principal funcional (erros no dual logging nao bloqueiam a sequencia)

Apos o deploy, um novo teste mostrara o erro real nos logs da Edge Function, possibilitando a correcao definitiva.
