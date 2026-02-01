
# Plano: Adicionar Ação "Acionar Webhook" na Enquete

## Visão Geral

Adicionar uma nova ação de enquete chamada "Acionar Webhook" (ou "Enviar para Webhook") que repassa a resposta integral da enquete para uma URL configurada pelo usuário. Diferente do "Notificar Administrador > Webhook", esta ação é dedicada exclusivamente para webhooks e envia um payload mais completo.

---

## Como Vai Funcionar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO: AÇÃO "ACIONAR WEBHOOK"                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Usuário vota na enquete]                                                  │
│           ↓                                                                 │
│  [handle-poll-response detecta ação "call_webhook"]                         │
│           ↓                                                                 │
│  [Envia POST para URL configurada com payload completo]                     │
│                                                                             │
│  Payload enviado:                                                           │
│  {                                                                          │
│    "event": "poll_vote",                                                    │
│    "poll": {                                                                │
│      "id": "uuid",                                                          │
│      "question": "Qual sua preferência?",                                   │
│      "options": ["Opção A", "Opção B", "Opção C"]                           │
│    },                                                                       │
│    "vote": {                                                                │
│      "option_index": 0,                                                     │
│      "option_text": "Opção A"                                               │
│    },                                                                       │
│    "respondent": {                                                          │
│      "phone": "5511999999999",                                              │
│      "name": "João Silva",                                                  │
│      "jid": "5511999999999@s.whatsapp.net"                                  │
│    },                                                                       │
│    "group": {                                                               │
│      "jid": "120363xxx@g.us"                                                │
│    },                                                                       │
│    "campaign_id": "uuid",                                                   │
│    "instance_id": "uuid",                                                   │
│    "timestamp": "2026-02-01T12:00:00Z"                                      │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Adicionar Novo Tipo de Ação

**Arquivo:** `src/components/group-campaigns/sequences/PollActionDialog.tsx`

Adicionar `call_webhook` ao tipo e lista de ações:

```typescript
// Atualizar o tipo
export type PollActionType =
  | "none"
  | "start_sequence"
  | "send_private_message"
  | "add_tag"
  | "remove_from_group"
  | "add_to_group"
  | "notify_admin"
  | "call_webhook";  // NOVO

// Adicionar à lista ACTION_TYPES
const ACTION_TYPES = [
  // ... existentes ...
  { value: "call_webhook", label: "Acionar Webhook", icon: Webhook, color: "text-cyan-500" },
];
```

---

### 2. Criar UI de Configuração do Webhook

**Arquivo:** `src/components/group-campaigns/sequences/PollActionDialog.tsx`

Adicionar seção de configuração para `call_webhook`:

```tsx
{actionType === "call_webhook" && (
  <div className="space-y-4 pt-2">
    <div className="space-y-2">
      <Label>URL do Webhook</Label>
      <Input
        placeholder="https://seu-sistema.com/webhook/poll"
        value={(config.webhookUrl as string) || ""}
        onChange={(e) => updateConfig("webhookUrl", e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        O payload completo da resposta será enviado via POST
      </p>
    </div>

    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>Incluir dados da instância</Label>
        <p className="text-xs text-muted-foreground">
          Adiciona informações da instância WhatsApp
        </p>
      </div>
      <Switch
        checked={(config.includeInstance as boolean) ?? true}
        onCheckedChange={(v) => updateConfig("includeInstance", v)}
      />
    </div>

    <div className="space-y-2">
      <Label>Headers customizados (opcional)</Label>
      <Textarea
        placeholder='{"Authorization": "Bearer token"}'
        value={(config.customHeaders as string) || ""}
        onChange={(e) => updateConfig("customHeaders", e.target.value)}
        rows={2}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        JSON com headers adicionais
      </p>
    </div>
  </div>
)}
```

---

### 3. Implementar Handler no Backend

**Arquivo:** `supabase/functions/handle-poll-response/index.ts`

Adicionar case para `call_webhook` no switch (após linha 529):

```typescript
case "call_webhook": {
  const webhookUrl = actionConfig.config.webhookUrl as string;
  
  if (!webhookUrl) {
    actionResult = { error: "No webhook URL configured" };
    break;
  }

  console.log(`[HandlePollResponse] Calling webhook: ${webhookUrl}`);

  // Build complete payload
  const webhookPayload = {
    event: "poll_vote",
    poll: {
      id: typedPoll.id,
      question: typedPoll.question_text,
      options: typedPoll.options,
    },
    vote: {
      option_index: response.option_index,
      option_text: response.option_text || typedPoll.options[response.option_index] || "",
    },
    respondent: {
      phone: respondent.phone,
      name: respondent.name || null,
      jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
    },
    group: {
      jid: group_jid,
    },
    campaign_id: typedPoll.campaign_id,
    sequence_id: typedPoll.sequence_id,
    node_id: typedPoll.node_id,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Optionally include instance data
  if (actionConfig.config.includeInstance !== false && instance) {
    webhookPayload.instance = {
      id: instance.id,
      name: instance.name,
      phone: instance.phone || "",
      provider: instance.provider,
    };
  }

  // Parse custom headers
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (actionConfig.config.customHeaders) {
    try {
      const customHeaders = JSON.parse(actionConfig.config.customHeaders as string);
      headers = { ...headers, ...customHeaders };
    } catch (e) {
      console.warn("[HandlePollResponse] Invalid custom headers JSON");
    }
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(webhookPayload),
  });

  actionResult = { 
    status: webhookResponse.status, 
    sent: webhookResponse.ok,
    url: webhookUrl,
  };
  actionSuccess = webhookResponse.ok;
  console.log(`[HandlePollResponse] Webhook called: ${actionSuccess}`);
  break;
}
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/group-campaigns/sequences/PollActionDialog.tsx` | Adicionar tipo `call_webhook`, ícone Webhook, e UI de configuração |
| `supabase/functions/handle-poll-response/index.ts` | Adicionar case `call_webhook` no switch de ações |

---

## Diferenças entre "Notificar Admin (Webhook)" e "Acionar Webhook"

| Aspecto | Notificar Admin (Webhook) | Acionar Webhook |
|---------|---------------------------|-----------------|
| Propósito | Notificação com mensagem customizada | Integração de dados completa |
| Payload | Apenas event, poll_id, respondent, response, message | Payload completo com todos os dados |
| Headers | Não configurável | Permite headers customizados |
| Instância | Não inclui | Opção de incluir dados da instância |
| Visibilidade | Escondido dentro de "Notificar Admin" | Ação própria no menu principal |

---

## Resultado Esperado

Após a implementação:

1. Nova opção "Acionar Webhook" visível no dropdown de ações
2. Campos de configuração: URL, toggle de instância, headers customizados
3. POST enviado com payload completo quando usuário votar
4. Suporte a autenticação via headers customizados
