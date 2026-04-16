

## Plano: Delegar triagem de membros ao n8n

### Mudança de abordagem

Ao invés de chamar n8n para obter metadata e fazer o diff no Supabase, a nova lógica é:

1. Quando `webhook-inbound` recebe evento `group_join`, chama `sync-group-members`
2. `sync-group-members` busca os leads atuais da campanha no banco e envia tudo ao n8n
3. O n8n faz a triagem (chama Z-API, compara, resolve LIDs) e retorna os leads atualizados
4. `sync-group-members` apenas salva o resultado no banco

### Payload que o sync-group-members vai enviar ao n8n

```json
{
  "action": "group.sync",
  "instanceId": "EXTERNAL_INSTANCE_ID",
  "instanceToken": "EXTERNAL_TOKEN",
  "groupJid": "120363427443466552@g.us",
  "campaignId": "uuid-da-campanha",
  "currentMembers": [
    { "phone": "5511999887766", "name": "João", "status": "active" },
    { "phone": "5521988776655", "name": "Maria", "status": "active" }
  ]
}
```

### Resposta que o n8n DEVE retornar

```json
{
  "entered": [
    { "phone": "5531977665544", "name": "Carlos", "isAdmin": false }
  ],
  "left": [
    { "phone": "5521988776655" }
  ]
}
```

- `entered`: novos membros que não estavam em `currentMembers` (com telefone real resolvido)
- `left`: membros que estavam em `currentMembers` mas não estão mais no grupo

### Alteração no código

**`supabase/functions/sync-group-members/index.ts`**

- Buscar membros ativos da campanha no DB (já faz isso)
- Enviar POST ao n8n `https://n8n-n8n.nuwfic.easypanel.host/webhook/groups` com `action: "group.sync"`, credenciais da instância, groupJid, e `currentMembers`
- Receber resposta com `entered[]` e `left[]`
- Processar `entered`: upsert em `group_members`, `leads`, e `group_member_history`
- Processar `left`: marcar como `left` em `group_members` e registrar em `group_member_history`
- Remover toda a lógica de diff local (comparação de mapas) — o n8n faz isso agora

### O que NÃO muda

- `webhook-inbound` continua chamando `sync-group-members` da mesma forma
- A estrutura de upsert em `group_members`, `leads` e `group_member_history` permanece
- Resolução de `senderLid` ainda tenta mapear se `entered` tem exatamente 1 membro

