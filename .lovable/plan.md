

## Corrigir extração: usar `connectedPhone` como telefone do lead

### Entendimento do Payload

Com base no payload real fornecido:
- `body.phone` = JID do grupo (ex: `120363425932296878-group`) -- **NÃO é o telefone do lead**
- `body.connectedPhone` = telefone real do lead (ex: `5512982402981`) -- **ESTE é o destino**
- `body.notificationParameters[0]` = LID do participante (ex: `15041025855619@lid`)

### Alterações em `supabase/functions/webhook-inbound/index.ts`

**1. `extractZApiContext` (linhas 402-408)**: Substituir a lógica atual que usa `notificationParameters[0]` como `senderPhone` para usar `body.connectedPhone`:

```typescript
// For group participant notifications, extract real participant data
const notification = body?.notification as string | undefined;
const notificationParams = body?.notificationParameters as string[] | undefined;
if (notification?.startsWith("GROUP_PARTICIPANT")) {
  // connectedPhone is the actual phone number of the joining participant
  const connectedPhone = body?.connectedPhone as string | undefined;
  if (connectedPhone) {
    senderPhone = connectedPhone;
  }
}
```

**2. Invocação do `pirate-process-join` (linhas 681-703)**: Passar `connectedPhone` como `phone` e `notificationParameters[0]` como `lid`:

```typescript
const rawBody = rawEvent.body as Record<string, unknown> | undefined;
const notifParams = rawBody?.notificationParameters as string[] | undefined;
const participantRaw = notifParams?.[0] || null;
const isLid = participantRaw?.includes("@lid");
const connectedPhone = rawBody?.connectedPhone as string | undefined;

body: JSON.stringify({
  group_jid: context.chatJid,
  phone: connectedPhone || context.senderPhone,  // telefone real
  lid: isLid ? participantRaw : null,              // LID completo
  instance_id: instance?.id || null,
  raw_event: rawEvent,
}),
```

### Resultado
- `phone` em `pirate_leads` = `5512982402981` (telefone real, usável como destino)
- `lid` em `pirate_leads` = `15041025855619@lid` (identificador WhatsApp)
- Webhook para n8n enviará ambos os campos corretamente

### Arquivos
- `supabase/functions/webhook-inbound/index.ts` (~10 linhas em 2 pontos)
- Re-deploy da edge function após alteração

