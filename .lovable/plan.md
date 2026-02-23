
# Auto-importar membros ao vincular grupo a campanha

## Resumo

Quando um grupo for vinculado a uma campanha (clicando "Adicionar a Campanha"), o sistema vai automaticamente:
1. Enviar um webhook para `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` pedindo a lista de membros do grupo
2. Aguardar a resposta com os dados dos membros
3. Inserir automaticamente os membros na tabela `group_members` vinculados a campanha

## Fluxo

```text
Usuario clica "Adicionar a Campanha"
       |
       v
Salva grupo(s) na tabela campaign_groups (ja existe)
       |
       v
Para cada grupo adicionado, envia POST para:
  https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent
  com payload: { action: "group.members", instance: {...}, group: { jid: "..." } }
       |
       v
Recebe resposta com lista de membros (phone, name, isAdmin, etc.)
       |
       v
Insere membros na tabela group_members via addMembersBulk
       |
       v
Toast de sucesso com contagem
```

## Arquivo modificado

**`src/components/group-campaigns/tabs/GroupsListTab.tsx`**

Mudancas:
- Importar `useGroupMembers` hook
- Apos `addGroups(groupsToAdd)` ter sucesso em `handleAddToCampaign`, iterar sobre os grupos adicionados e para cada um:
  - Enviar POST para `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` com action `group.members`, dados da instancia e o JID do grupo
  - Parsear a resposta (array de membros com phone/name/isAdmin)
  - Chamar `addMembersBulk` para inserir os membros no banco
- Mostrar feedback ao usuario (toast com quantidade de membros importados ou erro)
- O processo de buscar membros sera feito em background apos vincular o grupo, sem bloquear a UI (toast de "buscando membros..." seguido de resultado)

## Detalhes tecnicos

O payload enviado ao webhook seguira o padrao existente do `buildGroupPayload`:
```text
{
  action: "group.members",
  instance: { id, name, phone, provider, externalId, externalToken },
  group: { jid: "120363319799859760-group" },
  campaign: { id: "...", name: "" }
}
```

A resposta esperada e um array de objetos com ao menos `phone` (e opcionalmente `name`, `isAdmin`). O codigo vai tratar formatos flexiveis como `data.members`, `data.participants`, ou o array direto.
