

## Objetivo
Adicionar detecção automática para eventos de **group participant add** (e outros eventos de grupo similares) baseados no campo `body.notification` do payload Z-API via n8n.

## Análise do Payload

O evento de adição de participante vem com:
```json
{
  "body": {
    "type": "ReceivedCallback",
    "notification": "GROUP_PARTICIPANT_ADD",
    "notificationParameters": ["253438017437856@lid"]
  }
}
```

O campo chave é `body.notification` que contém o tipo de notificação de grupo.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Adicionar detecção de `body.notification` |
| `supabase/functions/reclassify-events/index.ts` | Replicar a mesma lógica |

## Lógica de Detecção

Adicionar verificação para `body.notification` **antes** do mapeamento direto de eventos, mapeando:

| body.notification | event_type |
|-------------------|------------|
| `GROUP_PARTICIPANT_ADD` | `group_join` |
| `GROUP_PARTICIPANT_REMOVE` | `group_leave` |
| `GROUP_PARTICIPANT_PROMOTE` | `group_promote` |
| `GROUP_PARTICIPANT_DEMOTE` | `group_demote` |

## Mudanças Técnicas

### Em ambas Edge Functions (`webhook-inbound` e `reclassify-events`)

Após a detecção de mídia e antes do mapeamento direto `ZAPI_EVENT_MAP`, adicionar:

```typescript
// ==========================================
// GROUP NOTIFICATION DETECTION (n8n/Z-API format)
// body.notification contains group events like GROUP_PARTICIPANT_ADD
// ==========================================
const notification = body?.notification as string | undefined;

if (notification) {
  const notificationMap: Record<string, string> = {
    "GROUP_PARTICIPANT_ADD": "group_join",
    "GROUP_PARTICIPANT_REMOVE": "group_leave", 
    "GROUP_PARTICIPANT_PROMOTE": "group_promote",
    "GROUP_PARTICIPANT_DEMOTE": "group_demote",
    "GROUP_PARTICIPANT_LEAVE": "group_leave",
    "GROUP_CREATE": "group_update",
    "GROUP_SUBJECT": "group_update",
    "GROUP_DESCRIPTION": "group_update",
    "GROUP_ICON": "group_update",
  };

  if (notificationMap[notification]) {
    return {
      eventType: notificationMap[notification],
      eventSubtype: notification,
      classification: "identified",
    };
  }
}
```

## Posicionamento no Código

A ordem de verificação em `classifyZApiEvent` será:
1. Detecção de mídia (image, video, audio, document, sticker)
2. **Detecção de notificações de grupo** ← NOVO
3. Mapeamento direto de eventos (`ZAPI_EVENT_MAP`)
4. Detecção de reações
5. Detecção de PLAYED
6. Detecção de texto em `body.text`
7. Fallback para `unknown`

## Resultado Esperado

Eventos com payload:
```json
{
  "body": {
    "notification": "GROUP_PARTICIPANT_ADD"
  }
}
```

Serão classificados como:
- `event_type`: `group_join`
- `event_subtype`: `GROUP_PARTICIPANT_ADD`
- `classification`: `identified`
- `processing_status`: `processed`

## Após Implementação

1. Edge Functions serão redeployadas automaticamente
2. Novos eventos de grupo serão identificados corretamente
3. Use "Reclassificar Todos" para corrigir eventos antigos

