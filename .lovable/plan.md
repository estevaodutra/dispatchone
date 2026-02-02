

# Plano: Acionar Automaticamente Ações de Poll Response

## Problema Identificado

O evento `42ff3cb2-c0c0-4f15-b829-5db21bfaa351` foi classificado corretamente como `poll_response`, mas a ação de webhook configurada **não foi executada** porque:

1. O `webhook-inbound` apenas **salva** o evento no banco de dados
2. O `handle-poll-response` precisa ser **chamado explicitamente** para processar ações
3. **Não existe integração automática** entre esses dois componentes

### Fluxo Atual (Quebrado)
```text
Z-API → webhook-inbound → Salva no DB → FIM ❌
                                        (ação não executada)
```

### Fluxo Esperado
```text
Z-API → webhook-inbound → Salva no DB → Detecta poll_response → 
        Chama handle-poll-response → Executa ação configurada ✅
```

---

## Solução Proposta

Adicionar lógica no `webhook-inbound` para **chamar automaticamente** o `handle-poll-response` quando um evento `poll_response` é detectado.

---

## Mudanças Necessárias

### 1. Atualizar `webhook-inbound/index.ts`

Após salvar o evento com sucesso, adicionar processamento automático para `poll_response`:

```typescript
// Após linha 551 (após console.log do event saved)

// ==========================================
// AUTO-PROCESS POLL RESPONSES
// ==========================================
if (classification.eventType === "poll_response") {
  try {
    const body = rawEvent.body as Record<string, unknown> | undefined;
    const pollVote = body?.pollVote as Record<string, unknown> | undefined;
    
    if (pollVote) {
      const options = pollVote.options as Array<{name: string}> | undefined;
      const pollMessageId = pollVote.pollMessageId as string;
      
      if (pollMessageId && options?.length) {
        // Extrair dados do respondente
        const participantPhone = body.participantPhone as string || 
                                 body.phone?.toString().split("-")[0];
        const senderName = body.senderName as string || "";
        const groupJid = body.phone as string || context.chatJid || "";
        
        // Buscar poll_message pelo message_id
        const { data: pollMessage } = await supabase
          .from("poll_messages")
          .select("id, options")
          .or(`message_id.eq.${pollMessageId},zaap_id.eq.${pollMessageId}`)
          .maybeSingle();
        
        if (pollMessage) {
          // Encontrar o índice da opção votada (fuzzy match)
          const votedOptionText = options[0]?.name || "";
          const pollOptions = pollMessage.options as string[];
          let optionIndex = pollOptions.findIndex(
            opt => opt.toLowerCase() === votedOptionText.toLowerCase()
          );
          
          // Se não encontrou exato, tentar match parcial
          if (optionIndex === -1) {
            optionIndex = pollOptions.findIndex(
              opt => opt.toLowerCase().includes(votedOptionText.toLowerCase()) ||
                     votedOptionText.toLowerCase().includes(opt.toLowerCase())
            );
          }
          
          if (optionIndex >= 0) {
            // Chamar handle-poll-response
            const pollPayload = {
              message_id: pollMessageId,
              instance_id: instance?.id || "",
              group_jid: groupJid,
              respondent: {
                phone: participantPhone,
                name: senderName,
                jid: `${participantPhone}@s.whatsapp.net`,
              },
              response: {
                option_index: optionIndex,
                option_text: votedOptionText,
              },
              timestamp: new Date().toISOString(),
              _raw_event: rawEvent, // Para forwardRawBody
            };
            
            // Invocar handle-poll-response via HTTP interno
            const pollResponse = await fetch(
              `${supabaseUrl}/functions/v1/handle-poll-response`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify(pollPayload),
              }
            );
            
            const pollResult = await pollResponse.json();
            console.log(`[webhook-inbound] Auto-processed poll response: ${JSON.stringify(pollResult)}`);
            
            // Atualizar processing_result
            await supabase
              .from("webhook_events")
              .update({
                processing_result: pollResult,
                processed_at: new Date().toISOString(),
              })
              .eq("id", insertedEvent.id);
          }
        }
      }
    }
  } catch (pollError) {
    console.error("[webhook-inbound] Error auto-processing poll:", pollError);
    // Não falha a requisição, apenas loga o erro
  }
}
```

### 2. Atualizar `handle-poll-response/index.ts`

Adicionar suporte para receber o `_raw_event` para uso no `forwardRawBody`:

```typescript
// Na interface PollResponseRequest, adicionar:
interface PollResponseRequest {
  // ... campos existentes ...
  _raw_event?: Record<string, unknown>; // Payload original do Z-API
}

// Na lógica de call_webhook, usar _raw_event quando forwardRawBody é true
if (actionConfig.config.forwardRawBody && body._raw_event) {
  webhookPayload = body._raw_event;
}
```

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `webhook-inbound/index.ts` | Adicionar auto-processamento de `poll_response` → chama `handle-poll-response` |
| `handle-poll-response/index.ts` | Adicionar suporte a `_raw_event` para `forwardRawBody` |

---

## Fluxo de Processamento Atualizado

```text
Z-API envia evento com pollVote
        ↓
webhook-inbound recebe
        ↓
classifica como poll_response
        ↓
salva no webhook_events
        ↓
detecta classification.eventType === "poll_response"
        ↓
extrai dados do pollVote (options, pollMessageId)
        ↓
busca poll_messages por message_id
        ↓
calcula option_index via fuzzy match
        ↓
chama handle-poll-response internamente
        ↓
handle-poll-response executa ação configurada (webhook, sequence, etc)
        ↓
atualiza processing_result no webhook_events
```

---

## Resultado Esperado

Após implementação:
- Eventos com `body.pollVote` serão automaticamente processados
- Ações configuradas (webhook, sequence, DM) serão executadas
- O `processing_result` mostrará o resultado da execução
- O `forwardRawBody` passará o payload original do Z-API

