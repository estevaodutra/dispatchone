
## Objetivo
Fazer com que eventos de **imagem** (Z-API via n8n) sejam **classificados automaticamente** (ex.: `image_message`) em vez de continuarem como `unknown/pending`, mesmo quando o payload chega no formato “n8n/Z-API” (ex.: `body.image`, `imageUrl`, `mimeType: "image/jpeg"`, etc.).

## O que está acontecendo hoje (causa raiz)
Pelo print, o payload de imagem não está no formato que o classificador atual do `webhook-inbound` espera (ele procura principalmente por `rawEvent.data.message.imageMessage` / `rawEvent.message.imageMessage` quando o evento é `message.received`/`ReceivedCallback`).

Só que, no seu caso (Z-API via n8n), imagens podem chegar como:
- `body.image` (como você comentou) e/ou
- campos “flat” no root: `imageUrl`, `mimeType`, `thumbnailUrl`, `caption`, etc.

Como o classificador não verifica esses formatos, ele cai no fallback:
- `event_type = "unknown"`
- `classification = "pending"`
- `processing_status = "pending"`

Mesmo que você “classifique manualmente” na UI um evento, os próximos eventos iguais continuam chegando “pending” porque a lógica automática ainda não reconhece esse formato.

## Estratégia de solução
Adicionar detecção específica para o formato n8n/Z-API de mídia (imagem/vídeo/áudio/documento) em **dois lugares**:
1) Função de ingestão (para novos eventos)
2) Função de reclassificação (para corrigir eventos antigos)

Além disso, aproveitar para melhorar a extração de contexto (`chat_jid`) para esse formato, porque esse tipo de payload geralmente vem com `phone`/`from` em vez de `data.key.remoteJid`.

---

## Arquivos que serão ajustados
1) `supabase/functions/webhook-inbound/index.ts`
2) `supabase/functions/reclassify-events/index.ts`

---

## Mudanças planejadas (detalhadas)

### 1) `webhook-inbound/index.ts` — melhorar `classifyZApiEvent` para mídia do n8n
Adicionar, dentro de `classifyZApiEvent`, uma verificação de mídia **antes do fallback `unknown`** (e preferencialmente antes do bloco “message.received”), mais ou menos assim:

- Ler `body`:
  - `const body = rawEvent.body as Record<string, unknown> | undefined;`

- Detectar imagem por múltiplos sinais:
  - `body?.image` existir (como você mencionou)
  - `body?.imageUrl` existir
  - `rawEvent.imageUrl` existir
  - `mimeType` começar com `"image/"` (no body ou no root)
  - (opcional) `minetype` (alguns payloads vêm com typo) também ser considerado

Se for imagem:
- `eventType = "image_message"`
- `eventSubtype` pode ser algo útil e estável, ex.:
  - `"body.image"`, `"imageUrl"`, ou o próprio `mimeType` (`"image/jpeg"`)
- `classification = "identified"`

Também acrescentar detecção equivalente para outros tipos de mídia (para evitar o mesmo problema amanhã):
- Vídeo: `videoUrl` / `mimeType: video/*` / `body.video`
- Áudio: `audioUrl` / `mimeType: audio/*` / `body.audio`
- Documento: `documentUrl` / `mimeType: application/*` / `body.document`

Observação importante:
- Mesmo que o `type` seja `ReceivedCallback`, o `ZAPI_EVENT_MAP` já transforma isso em `text_message` hoje, então a lógica precisa garantir que **quando houver sinais de mídia**, ela prevaleça sobre o mapeamento de texto. Isso é um detalhe crítico para não “forçar” tudo como `text_message`.

Como resolver isso de forma segura:
- Se `eventName === "ReceivedCallback"` e houver `body.image`/`imageUrl`/`mimeType image/*`, retornar `image_message` e não `text_message`.
- Manter o mapeamento `ReceivedCallback -> text_message` para quando for realmente texto.

### 2) `reclassify-events/index.ts` — repetir a mesma melhoria
O reclassificador precisa aplicar a mesma detecção para que os registros antigos “unknown/pending” virem `image_message/identified` e, consequentemente, `processing_status` vire `processed` (já implementado).

Então vamos:
- Inserir a mesma regra de detecção de mídia em `classifyZApiEvent` nesse arquivo.
- Garantir que o `.update({ ... })` já esteja atualizando:
  - `event_type`
  - `event_subtype`
  - `classification`
  - `processing_status` (já foi ajustado no último diff)

### 3) `extractZApiContext` no `webhook-inbound` — melhorar `chat_jid` para n8n/Z-API
Hoje o `webhook-inbound` tenta `key.remoteJid`, `data.chatId`, `rawEvent.chatId`. Para payloads do n8n, frequentemente vem:
- `rawEvent.phone` (no print aparece `phone: "1203...@newsletter"`), ou
- `rawEvent.from`, ou
- `body.from` / `body.phone`

Vamos adicionar fallback:
- Se `chatJid` ainda for null, usar `rawEvent.phone || rawEvent.from || body?.phone || body?.from`.
Isso melhora:
- exibição de “Nome do Chat / Message ID”
- filtros de pesquisa
- rastreabilidade geral

### 4) Verificação e validação (sem depender de “achismo”)
Após aplicar as mudanças:
- Enviar um novo evento de imagem (ou aguardar chegar) e confirmar que:
  - `event_type` vem como `image_message`
  - `classification` vem `identified`
  - `processing_status` vem `processed`
- Rodar “Reclassify All” (ou somente `only_unknown`/`only_pending` se disponível) para corrigir os antigos.

---

## Riscos e cuidados
- Não quebrar a classificação de texto: a nova lógica precisa diferenciar “texto” vs “imagem” dentro do mesmo `ReceivedCallback`.
- Nem todo `mimeType` será confiável; por isso vamos checar também `imageUrl`/`body.image`.
- Manter a lógica duplicada (webhook-inbound e reclassify-events) consistente para evitar divergências.

---

## Resultado esperado
1) Eventos de imagem que chegam como `body.image` ou `imageUrl/mimeType` serão automaticamente:
   - `event_type = image_message`
   - `classification = identified`
   - `processing_status = processed`
2) Reclassificação passará a corrigir eventos antigos de imagem que estavam como `unknown/pending`.
3) `chat_jid` deixará de ficar vazio em muitos casos desse formato do n8n.

---

## Checklist de aceitação (o que você vai ver na tela /events)
- Um novo evento de imagem entra e aparece com:
  - Tipo: `image_message`
  - Status de classificação: identificado
  - Status de processamento: processed
- Ao abrir “Detalhes do Evento”, o payload continua igual, mas os campos normalizados (tipo/status/chat) ficam preenchidos corretamente.
