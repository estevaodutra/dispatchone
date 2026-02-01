
# Plano: Adicionar Opção "Repassar Corpo Original" na Ação Webhook

## Contexto

Atualmente a ação "Acionar Webhook" monta um payload estruturado com dados processados:
```json
{
  "event": "poll_vote",
  "poll": { ... },
  "vote": { ... },
  "respondent": { ... },
  ...
}
```

O usuário quer ter a opção de simplesmente **repassar o corpo original** da requisição que chegou ao `handle-poll-response` - útil quando o n8n ou outro sistema envia dados extras que precisam ser preservados.

---

## Solução

Adicionar um toggle "Repassar corpo original" que, quando ativado, envia o payload recebido pelo `handle-poll-response` diretamente para o webhook configurado, sem processamento adicional.

---

## Mudanças Necessárias

### 1. Adicionar Toggle na UI

**Arquivo:** `src/components/group-campaigns/sequences/PollActionDialog.tsx`

Adicionar opção de toggle entre as configurações do `call_webhook` (após linha 588):

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>Repassar corpo original</Label>
    <p className="text-xs text-muted-foreground">
      Envia o payload original recebido, sem processamento
    </p>
  </div>
  <Switch
    checked={(config.forwardRawBody as boolean) || false}
    onCheckedChange={(v) => updateConfig("forwardRawBody", v)}
  />
</div>
```

### 2. Implementar no Backend

**Arquivo:** `supabase/functions/handle-poll-response/index.ts`

No case `call_webhook` (linhas 531-602), adicionar lógica para verificar o flag `forwardRawBody`:

```typescript
case "call_webhook": {
  const webhookUrl = actionConfig.config.webhookUrl as string;
  
  if (!webhookUrl) {
    actionResult = { error: "No webhook URL configured" };
    break;
  }

  console.log(`[HandlePollResponse] Calling webhook: ${webhookUrl}`);

  let webhookPayload: Record<string, unknown>;

  // Check if user wants to forward the raw body
  if (actionConfig.config.forwardRawBody) {
    // Forward the original request body as-is
    webhookPayload = body as Record<string, unknown>;
    console.log(`[HandlePollResponse] Forwarding raw body`);
  } else {
    // Build structured payload (existing logic)
    webhookPayload = {
      event: "poll_vote",
      poll: { ... },
      vote: { ... },
      ...
    };
    
    // Include instance if configured
    if (actionConfig.config.includeInstance !== false && instance) {
      webhookPayload.instance = { ... };
    }
  }

  // Parse custom headers (unchanged)
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  ...
}
```

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `src/components/group-campaigns/sequences/PollActionDialog.tsx` | Adicionar toggle `forwardRawBody` na seção call_webhook |
| `supabase/functions/handle-poll-response/index.ts` | Verificar flag e enviar `body` original quando ativado |

---

## Comportamento Esperado

| Toggle | O que é enviado |
|--------|-----------------|
| **Desativado** (padrão) | Payload estruturado com event, poll, vote, respondent, etc. |
| **Ativado** | Corpo JSON original da requisição recebida pelo handle-poll-response |

---

## Exemplo de Uso

Quando o n8n envia:
```json
{
  "message_id": "xxx",
  "instance_id": "yyy",
  "respondent": { "phone": "5511999999999", "name": "João" },
  "response": { "option_index": 0, "option_text": "Aprovado" },
  "extra_data": { "order_id": "12345", "amount": 150.00 }
}
```

Com "Repassar corpo original" ativado, o webhook destino recebe exatamente esse mesmo JSON - preservando `extra_data` e qualquer outro campo adicional.
