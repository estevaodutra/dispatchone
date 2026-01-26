
# Plano: Sistema de Recebimento de Eventos WhatsApp

## Resumo Executivo

Implementar um sistema centralizado para receber, classificar e armazenar todos os eventos de WhatsApp enviados pelo n8n. O n8n apenas repassa o payload original sem modificar, e o DispatchOne classifica e salva internamente.

---

## Arquitetura

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

## Etapa 1: Criar Tabela webhook_events

**Migration SQL:**

```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Origem
    source TEXT NOT NULL DEFAULT 'z-api',
    external_instance_id TEXT NOT NULL,
    instance_id UUID,
    
    -- Classificacao
    event_type TEXT NOT NULL DEFAULT 'unknown',
    event_subtype TEXT,
    classification TEXT DEFAULT 'pending',
    
    -- Contexto extraido
    chat_jid TEXT,
    chat_type TEXT,
    chat_name TEXT,
    sender_phone TEXT,
    sender_name TEXT,
    message_id TEXT,
    
    -- Payload
    raw_event JSONB NOT NULL,
    
    -- Processamento
    processing_status TEXT DEFAULT 'pending',
    processing_result JSONB,
    processing_error TEXT,
    
    -- Timestamps
    event_timestamp TIMESTAMPTZ,
    received_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Indices para performance
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_instance ON webhook_events(external_instance_id);
CREATE INDEX idx_webhook_events_classification ON webhook_events(classification);
CREATE INDEX idx_webhook_events_processing ON webhook_events(processing_status);
CREATE INDEX idx_webhook_events_received ON webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_chat ON webhook_events(chat_jid);
CREATE INDEX idx_webhook_events_sender ON webhook_events(sender_phone);
CREATE INDEX idx_webhook_events_user ON webhook_events(user_id);

-- RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook_events"
ON webhook_events FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own webhook_events"
ON webhook_events FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own webhook_events"
ON webhook_events FOR UPDATE USING (user_id = auth.uid());
```

---

## Etapa 2: Criar Edge Function webhook-inbound

**Arquivo:** `supabase/functions/webhook-inbound/index.ts`

**Funcionalidades:**
- Receber payload do n8n
- Classificar evento automaticamente
- Extrair contexto (chat, sender, message_id)
- Salvar em webhook_events
- Responder imediatamente (nao processar na hora)

**Classificador Z-API:**

| Campo event no raw_event | event_type |
|--------------------------|------------|
| poll.vote | poll_response |
| message.ack | message_status |
| group.participant.add | group_join |
| group.participant.remove | group_leave |
| group.participant.promote | group_promote |
| group.participant.demote | group_demote |
| group.update | group_update |
| connection.update | connection_status |
| qrcode.updated | qrcode_update |
| call.received | call_received |

**Se event = message.received, verificar raw_event.data.message:**

| Campo presente | event_type |
|----------------|------------|
| conversation ou extendedTextMessage | text_message |
| imageMessage | image_message |
| videoMessage | video_message |
| audioMessage | audio_message |
| documentMessage | document_message |
| stickerMessage | sticker_message |
| locationMessage | location_message |
| contactMessage | contact_message |
| buttonsResponseMessage | button_response |
| listResponseMessage | list_response |
| reactionMessage | message_reaction |

**Extracao de Contexto:**

```text
chat_jid      <- raw_event.data.key.remoteJid
chat_type     <- "group" se termina com "@g.us", senao "private"
chat_name     <- raw_event.data.pushName ou raw_event.data.groupName
sender_phone  <- extrair numero do JID (remover @s.whatsapp.net)
sender_name   <- raw_event.data.pushName
message_id    <- raw_event.data.key.id
event_timestamp <- converter raw_event.data.messageTimestamp
```

**Payload de Entrada:**

```json
{
  "source": "z-api",
  "instance_id": "external_instance_001",
  "received_at": "2025-01-24T14:30:00.000Z",
  "raw_event": { ... }
}
```

**Resposta Sucesso (201):**

```json
{
  "success": true,
  "event_id": "uuid-do-evento",
  "event_type": "poll_response",
  "classification": "identified"
}
```

---

## Etapa 3: Criar Hook useWebhookEvents

**Arquivo:** `src/hooks/useWebhookEvents.ts`

```typescript
interface WebhookEvent {
  id: string;
  source: string;
  instanceId: string;
  eventType: string;
  eventSubtype: string | null;
  classification: string;
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderName: string | null;
  messageId: string | null;
  rawEvent: object;
  processingStatus: string;
  processingResult: object | null;
  processingError: string | null;
  eventTimestamp: string | null;
  receivedAt: string;
  processedAt: string | null;
}
```

**Funcoes:**
- fetchEvents(filters) - Listar com paginacao
- fetchEventById(id) - Detalhes
- updateClassification(id, eventType) - Classificar manualmente
- reprocessEvent(id) - Reprocessar
- ignoreEvent(id) - Ignorar
- fetchStats() - Contadores

---

## Etapa 4: Criar Pagina de Eventos

**Arquivo:** `src/pages/WebhookEvents.tsx`

**Layout:**

```text
+----------------------------------------------------------+
| Eventos de Webhook                    [Refresh] [Export] |
+----------------------------------------------------------+
| Retem eventos por 24 horas                               |
+----------------------------------------------------------+
| Hoje: 1234 | Pendentes: 23 | Erros: 5 | Processados: 1206|
+----------------------------------------------------------+
| [Todos] [Pendentes] [Identificados] [Processados] [Erros]|
+----------------------------------------------------------+
| Filtros: [Periodo] [Tipo] [Categoria] [Instancia] [Status]|
+----------------------------------------------------------+
| Buscar por chat, telefone, message_id...                 |
+----------------------------------------------------------+
| ID     | Data/Hora | Tipo        | Chat    | Remetente...|
|--------|-----------|-------------|---------|-------------|
| abc123 | 26/01 14h | text_message| Grupo X | Joao Silva  |
| def456 | 26/01 14h | poll_response| Grupo Y| Maria...    |
+----------------------------------------------------------+
```

**Cores por Categoria:**

| Categoria | Cor | event_types |
|-----------|-----|-------------|
| Mensagens | Azul | text_message, image_message, video_message, audio_message, document_message, sticker_message, location_message, contact_message, message_status, message_reaction |
| Interativos | Verde | button_response, list_response, poll_response |
| Grupos | Roxo | group_join, group_leave, group_promote, group_demote, group_update |
| Conexao | Amarelo | connection_status, qrcode_update |
| Chamadas | Laranja | call_received |
| Pendente | Cinza | unknown |

**Modal de Detalhes:**
- Informacoes Gerais (ID, tipo, categoria, classificacao, instancia, origem)
- Contexto (chat, remetente, message_id, timestamp)
- Status (processamento, resultado, erro)
- Payload Original (JSON com syntax highlight e botao copiar)
- Botoes: Reprocessar, Ignorar, Fechar

---

## Etapa 5: Adicionar ao Menu

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Adicionar novo item no systemNavItems:

```typescript
{ title: "Eventos", url: "/events", icon: Radio }
```

---

## Etapa 6: Adicionar Rota

**Arquivo:** `src/App.tsx`

```typescript
import WebhookEvents from "./pages/WebhookEvents";

<Route
  path="/events"
  element={
    <ProtectedRoute>
      <AppLayout>
        <WebhookEvents />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

---

## Etapa 7: Adicionar Traducoes

**Arquivo:** `src/i18n/locales/pt.ts` e similares

```typescript
webhookEvents: {
  title: "Eventos de Webhook",
  description: "Visualize e gerencie eventos recebidos do WhatsApp",
  today: "Hoje",
  pending: "Pendentes",
  withErrors: "Com Erro",
  processed: "Processados",
  all: "Todos",
  identified: "Identificados",
  retentionInfo: "Os eventos sao retidos por 24 horas",
  eventDetails: "Detalhes do Evento",
  generalInfo: "Informacoes Gerais",
  context: "Contexto",
  processingStatus: "Status de Processamento",
  rawPayload: "Payload Original",
  reprocess: "Reprocessar",
  ignore: "Ignorar",
  classify: "Classificar",
  copyPayload: "Copiar",
  noEvents: "Nenhum evento encontrado",
  noEventsDescription: "Eventos de webhook aparecerao aqui quando forem recebidos",
  // Tipos de evento
  eventTypes: {
    text_message: "Mensagem de Texto",
    image_message: "Imagem",
    video_message: "Video",
    audio_message: "Audio",
    document_message: "Documento",
    sticker_message: "Figurinha",
    location_message: "Localizacao",
    contact_message: "Contato",
    message_status: "Status de Entrega",
    message_reaction: "Reacao",
    button_response: "Resposta de Botao",
    list_response: "Selecao de Lista",
    poll_response: "Voto em Enquete",
    group_join: "Entrada no Grupo",
    group_leave: "Saida do Grupo",
    group_promote: "Promocao a Admin",
    group_demote: "Remocao de Admin",
    group_update: "Atualizacao de Grupo",
    connection_status: "Status de Conexao",
    qrcode_update: "Atualizacao QR Code",
    call_received: "Chamada Recebida",
    unknown: "Nao Identificado",
  },
  // Categorias
  categories: {
    messages: "Mensagens",
    interactive: "Interativos",
    groups: "Grupos",
    connection: "Conexao",
    calls: "Chamadas",
    pending: "Pendente",
  },
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/xxx_create_webhook_events.sql` | Criar tabela |
| `supabase/functions/webhook-inbound/index.ts` | Criar edge function |
| `src/hooks/useWebhookEvents.ts` | Criar hook |
| `src/pages/WebhookEvents.tsx` | Criar pagina |
| `src/components/layout/AppSidebar.tsx` | Adicionar item menu |
| `src/App.tsx` | Adicionar rota |
| `src/i18n/locales/pt.ts` | Adicionar traducoes |
| `src/i18n/locales/en.ts` | Adicionar traducoes |
| `src/i18n/locales/es.ts` | Adicionar traducoes |
| `supabase/config.toml` | Adicionar funcao |

---

## Secao Tecnica: Estrutura da Edge Function

```typescript
// supabase/functions/webhook-inbound/index.ts

interface InboundPayload {
  source: "z-api" | "evolution" | "meta";
  instance_id: string;
  received_at: string;
  raw_event: Record<string, unknown>;
}

// 1. Resolver instance_id externo para UUID interno
// 2. Classificar evento baseado no source
// 3. Extrair contexto do raw_event
// 4. Salvar em webhook_events
// 5. Retornar imediatamente

// Classificador Z-API
function classifyZApiEvent(rawEvent: Record<string, unknown>): {
  eventType: string;
  eventSubtype: string | null;
  classification: "identified" | "pending";
} {
  const event = rawEvent.event as string;
  const data = rawEvent.data as Record<string, unknown>;
  
  // Mapeamento direto
  const directMap: Record<string, string> = {
    "poll.vote": "poll_response",
    "message.ack": "message_status",
    "group.participant.add": "group_join",
    "group.participant.remove": "group_leave",
    "group.participant.promote": "group_promote",
    "group.participant.demote": "group_demote",
    "group.update": "group_update",
    "connection.update": "connection_status",
    "qrcode.updated": "qrcode_update",
    "call.received": "call_received",
  };
  
  if (directMap[event]) {
    return { eventType: directMap[event], eventSubtype: null, classification: "identified" };
  }
  
  // Se message.received, verificar tipo de mensagem
  if (event === "message.received" && data?.message) {
    const message = data.message as Record<string, unknown>;
    if (message.conversation || message.extendedTextMessage) {
      return { eventType: "text_message", eventSubtype: null, classification: "identified" };
    }
    // ... outros tipos
  }
  
  return { eventType: "unknown", eventSubtype: null, classification: "pending" };
}

// Extrator de contexto
function extractContext(rawEvent: Record<string, unknown>): {
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderName: string | null;
  messageId: string | null;
  eventTimestamp: string | null;
} {
  const data = rawEvent.data as Record<string, unknown>;
  const key = data?.key as Record<string, unknown>;
  
  const chatJid = key?.remoteJid as string || null;
  const chatType = chatJid?.endsWith("@g.us") ? "group" : "private";
  
  return {
    chatJid,
    chatType,
    chatName: data?.pushName || data?.groupName || null,
    senderPhone: chatJid?.split("@")[0] || null,
    senderName: data?.pushName || null,
    messageId: key?.id || null,
    eventTimestamp: data?.messageTimestamp 
      ? new Date(Number(data.messageTimestamp) * 1000).toISOString() 
      : null,
  };
}
```

---

## Fluxo Completo

```text
1. Z-API envia webhook para n8n
2. n8n adiciona metadados (source, instance_id, received_at)
3. n8n faz POST para /functions/v1/webhook-inbound
4. Edge Function:
   a. Resolve external_instance_id para instance_id interno
   b. Classifica evento automaticamente
   c. Extrai contexto (chat, sender, message_id)
   d. Salva em webhook_events
   e. Retorna sucesso imediato
5. Evento fica disponivel no painel /events
6. Processamento especifico acontece depois (por tipo)
```

---

## Estimativa de Arquivos

| Item | Quantidade |
|------|------------|
| Migration SQL | 1 |
| Edge Function | 1 |
| Hook | 1 |
| Pagina | 1 |
| Arquivos modificados | 5 |
| **Total** | **9 arquivos** |
