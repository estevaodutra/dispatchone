

## Diagnóstico — `body.poll.question` chega como `{{fileName}}` literal

Confirmado no banco. A enquete `3EB09505C651971E3B4D33`:
- **`group_message_logs` (17:14)**: question já resolvida → `ORD-1776791641168_FF9DDD5A` ✅ (substituição funcionou no envio)
- **`poll_messages` (22:40)**: question salva como `{{fileName}}` literal ❌

Quando o voto chegou às 22:40, `handle-poll-response` leu `poll_messages.question_text = "{{fileName}}"` e enviou ao webhook configurado (linha 547: `question: typedPoll.question_text`).

### Causas raiz (duas)

**1. `execute-message/index.ts` linha 1015** — o registro em `poll_messages` é pulado quando `dest.isPrivate` é true:
```ts
if (node.node_type === "poll" && (zaapId || externalMessageId) && !dest.isPrivate) {
```
Sequências disparadas por **webhook** sempre usam `sendPrivate: true` (`trigger-sequence` linha 197), então polls enviados em modo privado **nunca** são registrados pelo caminho primário (que tem a question já substituída).

**2. Fallback de auto-registro** em `webhook-inbound/index.ts` linha 198 e migration de backfill:
```ts
question_text: (nodeConfig.question as string) || (nodeConfig.label as string) || "",
```
Lê o **template** do `sequence_nodes.config.question` (`{{fileName}}`), não o valor resolvido que está em `group_message_logs.payload.node.config.question`.

Resultado: o fallback acaba sendo o **único** caminho que registra polls privados, e ele salva sempre o template literal.

## Solução

### 1. `supabase/functions/execute-message/index.ts` (linha 1015)
Remover a restrição `!dest.isPrivate` — registrar a poll em `poll_messages` independentemente de ser privado ou para grupo. O `group_jid` salvo continua vindo de `dest.group_jid` (que para envio privado é `{phone}@s.whatsapp.net`, e isso não impede o lookup posterior por `message_id`/`zaap_id`).

### 2. `supabase/functions/webhook-inbound/index.ts` (linha 198) — fallback de auto-registro
Trocar a leitura do template pelo valor já resolvido no log:
```ts
const logPayload = logEntry.payload as Record<string, unknown> | null;
const logNode = logPayload?.node as Record<string, unknown> | undefined;
const logConfig = (logNode?.config as Record<string, unknown>) || {};

question_text: (logConfig.question as string) || (logConfig.label as string)
            || (nodeConfig.question as string) || (nodeConfig.label as string) || "",
options: (logConfig.options as unknown[]) || nodeConfig.options || [],
```
Mantém `optionActions` vindo de `sequence_nodes.config` (são configurações de ação, não texto).

### 3. Backfill SQL (uma vez)
Atualizar `poll_messages` existentes que tenham `question_text` contendo `{{` (templates não resolvidos), substituindo pelos valores já resolvidos do `group_message_logs.payload.node.config.question`:
```sql
UPDATE poll_messages pm
SET question_text = COALESCE(
      gml.payload->'node'->'config'->>'question',
      gml.payload->'node'->'config'->>'label',
      pm.question_text
    ),
    options = COALESCE(gml.payload->'node'->'config'->'options', pm.options)
FROM group_message_logs gml
WHERE (gml.external_message_id = pm.message_id OR gml.zaap_id = pm.zaap_id)
  AND gml.node_type = 'poll'
  AND gml.status = 'sent'
  AND pm.question_text LIKE '%{{%';
```

## Comportamento final

- Polls enviados via gatilho de webhook (privados) passam a registrar `poll_messages` com question já substituída no momento do envio
- Caso o caminho primário falhe e o fallback dispare, ele lê o valor resolvido do log em vez do template
- Polls existentes com `{{fileName}}` literal são corrigidos pelo backfill, então votos futuros para enquetes antigas também enviarão a question correta

