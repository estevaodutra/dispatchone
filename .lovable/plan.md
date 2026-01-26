

# Plano: Adicionar Endpoint webhook-inbound na Documentacao da API

## Resumo

Adicionar o endpoint `POST /webhook-inbound` na documentacao da API existente, criando uma nova categoria "Webhooks (Recebimento)" que documenta como receber eventos do WhatsApp via n8n.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/data/api-endpoints.ts` | Adicionar nova categoria e endpoint |
| `src/components/api-docs/ApiSidebar.tsx` | Adicionar icone para nova categoria |

---

## Etapa 1: Adicionar Categoria no api-endpoints.ts

Criar nova categoria `webhooks-inbound` com o endpoint:

```typescript
{
  id: "webhooks-inbound",
  name: "Webhooks (Recebimento)",
  description: "Endpoint para receber eventos do WhatsApp via n8n",
  endpoints: [
    {
      id: "webhook-inbound",
      method: "POST",
      path: "/webhook-inbound",
      description: "Recebe eventos de WhatsApp do n8n...",
      attributes: [...],
      examples: {...},
      responses: {...}
    }
  ]
}
```

**Atributos do Endpoint:**

| Nome | Tipo | Obrigatorio | Descricao |
|------|------|-------------|-----------|
| source | string | Sim | Origem do evento: z-api, evolution, meta |
| instance_id | string | Sim | ID externo da instancia WhatsApp |
| received_at | string | Nao | Data/hora do recebimento (ISO 8601) |
| raw_event | object | Sim | Payload original do provedor |

**Respostas:**

- **201 (Sucesso)**: `{ success: true, event_id, event_type, classification }`
- **400 (Erro)**: `{ success: false, error: "Missing required fields" }`

---

## Etapa 2: Adicionar Icone na Sidebar

No `ApiSidebar.tsx`, adicionar mapeamento do icone:

```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  // ... existentes
  "webhooks-inbound": <Radio className="h-4 w-4" />,
};
```

---

## Estrutura do Endpoint na Documentacao

### Descricao

"Recebe eventos de WhatsApp repassados pelo n8n. O sistema classifica automaticamente o tipo de evento e extrai contexto (chat, remetente, message_id). Este endpoint e publico e nao requer autenticacao."

### Exemplo cURL

```bash
curl -X POST "BASE_URL/webhook-inbound" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "z-api",
    "instance_id": "instance_001",
    "raw_event": {
      "event": "message.received",
      "data": {
        "key": { "remoteJid": "5511999999999@s.whatsapp.net", "id": "MSG123" },
        "message": { "conversation": "Ola!" },
        "pushName": "Joao Silva",
        "messageTimestamp": 1706284200
      }
    }
  }'
```

### Tipos de Evento Identificados

Incluir tabela com todos os 23 tipos de evento que o sistema reconhece automaticamente:

| event_type | Descricao | Categoria |
|------------|-----------|-----------|
| text_message | Mensagem de texto | Mensagens |
| image_message | Imagem | Mensagens |
| poll_response | Voto em enquete | Interativos |
| group_join | Entrada no grupo | Grupos |
| ... | ... | ... |

---

## Diagrama do Fluxo

```text
[Z-API / Evolution / Meta]
            |
            v
[n8n: repassa payload sem modificar]
            |
            v
[POST /functions/v1/webhook-inbound]
            |
            v
[DispatchOne: Classifica + Salva]
            |
            v
[Painel de Eventos (/events)]
```

---

## Secao Tecnica

**Logica de Classificacao:**

O endpoint analisa o campo `event` no `raw_event` e mapeia para tipos internos:

- `poll.vote` → `poll_response`
- `message.ack` → `message_status`
- `group.participant.add` → `group_join`
- `message.received` + `conversation` → `text_message`
- `message.received` + `imageMessage` → `image_message`

**Extracao de Contexto:**

O sistema extrai automaticamente:
- `chat_jid` do `raw_event.data.key.remoteJid`
- `chat_type` ("group" se termina com `@g.us`)
- `sender_phone` do JID
- `sender_name` do `pushName`
- `message_id` do `raw_event.data.key.id`

---

## Estimativa

| Item | Quantidade |
|------|------------|
| Arquivos modificados | 2 |
| Linhas adicionadas | ~180 |
| Tempo estimado | ~5 minutos |

