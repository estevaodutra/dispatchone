

## Plano: Simplificar sync-group-members usando "group.members"

### Abordagem

Ao receber evento `group_join` ou `group_leave`, a função `sync-group-members` vai:

1. Buscar credenciais da instância no DB
2. Buscar membros ativos atuais da campanha no DB
3. POST ao n8n `https://n8n-n8n.nuwfic.easypanel.host/webhook/groups` com `action: "group.members"` (mesmo payload que a aba Membros já usa)
4. Receber a lista completa de participantes do grupo (com telefones reais)
5. Cruzar localmente: quem está na resposta mas não no DB = **entrou**; quem está no DB mas não na resposta = **saiu**
6. Salvar normalmente em `group_members`, `leads`, `group_member_history`

### Payload enviado ao n8n

Usa o mesmo formato `buildGroupPayload` que o frontend já usa:

```json
{
  "action": "group.members",
  "instance": {
    "id": "instance-uuid",
    "name": "Instance Name",
    "externalId": "EXTERNAL_ID",
    "externalToken": "EXTERNAL_TOKEN"
  },
  "campaign": { "id": "campaign-uuid" },
  "group": { "jid": "120363408661213011@g.us" }
}
```

### Resposta esperada do n8n (já funciona assim)

Array ou objeto com `participants`:
```json
[{
  "participants": [
    { "phone": "5511999887766", "name": "João", "isAdmin": true },
    { "phone": "5521988776655", "name": "Maria", "isAdmin": false }
  ]
}]
```

### Diff local (feito no Edge Function)

```text
membros n8n (por phone)  vs  membros DB ativos (por phone)
─────────────────────────────────────────────────────────
no n8n mas NÃO no DB  →  entered (upsert group_members + leads + history "join")
no DB mas NÃO no n8n  →  left (update status="left" + history "leave")
```

### Alteração

**`supabase/functions/sync-group-members/index.ts`**

- Remover a action `group.sync` e interfaces `N8nSyncResponse`
- Buscar dados adicionais da instância (`name`, `provider`) para montar o payload
- POST com `action: "group.members"` + dados da instância + group JID
- Parsear resposta (mesmo parser do frontend: suporta array com `participants`, objeto com `participants` ou `members`)
- Criar sets de phones do n8n vs DB
- `entered` = phones no n8n que não estão no DB → upsert
- `left` = phones no DB que não estão no n8n → marcar como saiu
- Manter lógica de `senderLid` resolution e batch inserts

### Vantagem

- Reutiliza o mesmo workflow n8n que já funciona na aba Membros
- Zero lógica nova no n8n — não precisa configurar nada
- Diff é simples e confiável, feito no Supabase

