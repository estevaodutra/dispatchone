

## Corrigir extração de participante em eventos `group_join` para Campanhas Pirata

### Problema
Quando um membro entra no grupo, o Z-API envia:
- `body.phone` = JID do grupo (ex: `120363423547118470-group`)
- `body.notificationParameters` = `["2495543783502@lid"]` (participante real)

O `extractZApiContext` usa `chatJid.split("@")[0]` como `senderPhone`, resultando no ID do grupo ao invés do participante. O `pirate-process-join` recebe o grupo como `phone` e `lid: null`.

### Solução

**1. `supabase/functions/webhook-inbound/index.ts`** -- Duas alterações:

**a) Em `extractZApiContext` (~linha 396)**: Após calcular `senderPhone`, detectar se é evento de notificação de grupo e extrair o participante real de `notificationParameters`:

```typescript
let senderPhone = chatJid?.split("@")[0] || null;

// For group notifications, extract participant from notificationParameters
const notification = body?.notification as string | undefined;
const notificationParams = body?.notificationParameters as string[] | undefined;
if (notification?.startsWith("GROUP_PARTICIPANT") && notificationParams?.length) {
  const participant = notificationParams[0]; // "2495543783502@lid" or "5511999@c.us"
  senderPhone = participant.split("@")[0];
}
```

**b) Na invocação do `pirate-process-join` (~linha 681)**: Passar tanto o `phone` (que agora será o LID/número do participante) quanto o `lid` extraído do `notificationParameters`:

```typescript
const rawBody = rawEvent.body as Record<string, unknown> | undefined;
const notifParams = rawBody?.notificationParameters as string[] | undefined;
const participantRaw = notifParams?.[0] || null; // "2495543783502@lid"
const isLid = participantRaw?.includes("@lid");

body: JSON.stringify({
  group_jid: context.chatJid,
  phone: context.senderPhone,           // LID number or phone
  lid: isLid ? participantRaw : null,    // Full LID if applicable
  instance_id: instance?.id || null,
  raw_event: rawEvent,
}),
```

**2. `supabase/functions/pirate-process-join/index.ts`** -- Nenhuma alteração necessária. O campo `lid` já é aceito e armazenado. O `phone` agora receberá o valor correto (número do participante em vez do JID do grupo).

### Resultado
- `phone` no `pirate_leads` passará a conter o ID real do participante (ex: `2495543783502`)
- `lid` conterá o identificador completo (ex: `2495543783502@lid`) quando aplicável
- O webhook para n8n enviará os dados corretos do participante
- Deduplicação por `phone` funcionará corretamente

### Arquivos alterados
- `supabase/functions/webhook-inbound/index.ts` (~10 linhas em 2 pontos)

