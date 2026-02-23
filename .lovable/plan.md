
# Adicionar botao "Listar Membros" na aba Membros

## Resumo

Adicionar um botao "Listar Membros" na barra de acoes da aba Membros que, ao ser clicado, busca os grupos vinculados a campanha, envia uma requisicao para o webhook `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` pedindo a lista de membros de cada grupo, e insere os resultados na tabela `group_members`.

## Arquivo modificado

**`src/components/group-campaigns/tabs/MembersTab.tsx`**

### Mudancas:

1. Importar `useCampaignGroups` e `useInstances` para obter os grupos vinculados e dados da instancia
2. Importar `buildGroupPayload` de `webhook-utils`
3. Adicionar estado `isFetchingMembers` para controlar loading do botao
4. Criar funcao `handleFetchMembers` que:
   - Busca os grupos vinculados (via `useCampaignGroups`)
   - Para cada grupo, envia POST para `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` com action `group.members`, dados da instancia e JID do grupo
   - Parseia a resposta (array de membros com phone/name/isAdmin)
   - Chama `addMembersBulk` para inserir no banco
   - Mostra toast com contagem total de membros importados
5. Adicionar botao "Listar Membros" (com icone `RefreshCw`) ao lado dos botoes existentes (antes do "Importar CSV"), desabilitado quando nao ha grupos vinculados ou quando esta carregando

### Detalhes tecnicos

O payload enviado ao webhook:
```text
{
  action: "group.members",
  instance: { id, name, phone, provider, externalId, externalToken },
  group: { jid: "120363319799859760-group" },
  campaign: { id: "...", name: "..." }
}
```

A resposta esperada e um array de membros. O codigo vai tentar normalizar formatos flexiveis (`data.members`, `data.participants`, ou array direto), extraindo `phone`, `name` e `isAdmin` de cada membro.

O endpoint fixo sera `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` conforme solicitado pelo usuario.
