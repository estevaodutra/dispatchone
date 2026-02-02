

# Plano: Endpoint para Consultar Conteúdo por MessageId

## Objetivo

Criar um novo endpoint `GET /message-content` que permite consultar o conteúdo de uma mensagem/evento baseado no `messageId` do WhatsApp. Isso é útil para sistemas externos que recebem apenas o messageId e precisam acessar o conteúdo completo.

---

## Visão Geral

O endpoint consultará a tabela `webhook_events` pelo campo `message_id` e retornará o conteúdo estruturado da mensagem, incluindo texto, mídia, ou dados de enquete.

---

## Mudanças Necessárias

### 1. Criar Edge Function `message-content`

Criar `supabase/functions/message-content/index.ts`:

- Aceita `GET` com query parameter `messageId`
- Requer autenticação via Bearer token
- Busca na tabela `webhook_events` pelo `message_id`
- Extrai e estrutura o conteúdo do `raw_event`

**Campos retornados:**
- `event_id`: UUID do evento
- `message_id`: ID original do WhatsApp
- `event_type`: Tipo do evento (text_message, image_message, etc.)
- `chat_jid`: JID do chat
- `sender_phone`: Telefone do remetente
- `sender_name`: Nome do remetente
- `content`: Conteúdo estruturado baseado no tipo
  - Para texto: `{ text: "..." }`
  - Para imagem: `{ imageUrl: "...", caption: "...", mimeType: "..." }`
  - Para áudio/vídeo: `{ mediaUrl: "...", mimeType: "..." }`
  - Para poll_response: `{ pollMessageId: "...", options: [...] }`
- `timestamp`: Data/hora do evento
- `raw_event`: Payload original completo (opcional via query param `include_raw=true`)

### 2. Atualizar `supabase/config.toml`

Adicionar configuração:
```toml
[functions.message-content]
verify_jwt = false
```

### 3. Adicionar Documentação em `src/data/api-endpoints.ts`

Criar nova categoria "Consultas" ou adicionar ao final dos endpoints:

```typescript
{
  id: "queries",
  name: "Consultas",
  description: "Endpoints para consultar dados de mensagens e eventos",
  endpoints: [
    {
      id: "message-content",
      method: "GET",
      path: "/message-content",
      description: "Consulta o conteúdo de uma mensagem pelo messageId do WhatsApp",
      // ... atributos, exemplos, respostas
    }
  ]
}
```

### 4. Atualizar `ApiSidebar.tsx`

Adicionar ícone para a nova categoria:
```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  // ... existentes
  queries: <Search className="h-4 w-4" />,
};
```

---

## Detalhes Técnicos

### Edge Function `message-content/index.ts`

```typescript
// Estrutura básica
Deno.serve(async (req) => {
  // 1. Validar autenticação via validate-api-key
  // 2. Extrair messageId da URL
  // 3. Buscar em webhook_events por message_id
  // 4. Extrair conteúdo do raw_event baseado no event_type
  // 5. Retornar dados estruturados
});
```

### Lógica de Extração de Conteúdo

```typescript
function extractContent(eventType: string, rawEvent: object) {
  const body = rawEvent.body;
  
  switch(eventType) {
    case "text_message":
      return { text: body.text?.message || body.message };
    case "image_message":
      return { 
        imageUrl: body.image?.imageUrl || body.photo,
        caption: body.image?.caption,
        mimeType: body.image?.mimeType
      };
    case "poll_response":
      return {
        pollMessageId: body.pollVote?.pollMessageId,
        options: body.pollVote?.options
      };
    // ... outros tipos
  }
}
```

---

## Exemplo de Uso

### Request
```bash
curl -X GET "https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/message-content?messageId=3EB0191BA58CF690D254A1" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Response (sucesso)
```json
{
  "success": true,
  "data": {
    "event_id": "42ff3cb2-c0c0-4f15-b829-5db21bfaa351",
    "message_id": "3EB0191BA58CF690D254A1",
    "event_type": "poll_response",
    "chat_jid": "120363376787776025-group",
    "sender_phone": "5512982402981",
    "sender_name": "João Silva",
    "content": {
      "pollMessageId": "3EB0191BA58CF690D254A1",
      "options": [{ "name": "Recebido, em separação" }]
    },
    "timestamp": "2025-01-27T21:42:11.000Z"
  }
}
```

### Response (não encontrado)
```json
{
  "success": false,
  "error": {
    "code": "MESSAGE_NOT_FOUND",
    "message": "Nenhuma mensagem encontrada com o messageId informado"
  }
}
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/message-content/index.ts` | Criar nova Edge Function |
| `supabase/config.toml` | Adicionar configuração da função |
| `src/data/api-endpoints.ts` | Adicionar documentação do endpoint |
| `src/components/api-docs/ApiSidebar.tsx` | Adicionar ícone da categoria |

