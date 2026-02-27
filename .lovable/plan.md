

## Plano: Reescrever ExtractLeadsDialog com 4 Passos

O modal atual lista grupos do banco de dados (`campaign_groups`). O correto é buscar grupos em tempo real da API do WhatsApp, usando o mesmo padrão do `GroupsListTab`.

### Arquivo: `src/components/leads/ExtractLeadsDialog.tsx` (reescrever)

**4 passos em vez de 3:**

1. **Passo 1 — Selecionar Instância**: Listar instâncias de `useInstances()`, filtrar conectadas, permitir selecionar uma. Mostrar nome, provider, telefone e status com badge colorido.

2. **Passo 2 — Listar Grupos**: Usar `buildGroupPayload({ action: "group.list", ... })` + `getWebhookUrlForCategory("groups", configs)` (mesmo padrão do `GroupsListTab`). Filtrar `isGroup === true`. Exibir com checkbox, nome do grupo, JID e badge "👥 X membros" (usar `messagesUnread` ou dados retornados). Busca por nome. Selecionar todos.

3. **Passo 3 — Extrair Leads**: Para cada grupo selecionado, buscar membros via `buildGroupPayload({ action: "group.members", ... group: { jid } })`. Opções: ignorar inválidos, ignorar admins, manter referência, tags. Barra de progresso por grupo. Prévia com resumo (total, válidos, duplicados, inválidos).

4. **Passo 4 — Atribuir Campanha**: Selecionar campanha destino (agrupada por tipo: ligação/despacho/grupo). Checkbox "ignorar leads que já existem nesta campanha". Botão "Importar X Leads". Upsert em `leads` + sync para `call_leads`/`dispatch_campaign_contacts` conforme tipo.

**Resultado final**: Tela de sucesso com detalhes (instância, grupos, campanha, tags, importados/existentes/inválidos). Botões "Ver Leads" e "Fechar".

### Dependências reutilizadas
- `useInstances()` para lista de instâncias
- `useWebhookConfigs()` + `getWebhookUrlForCategory("groups")` para URL do webhook
- `buildGroupPayload()` de `webhook-utils.ts` para payload padronizado
- `useCallCampaigns()`, `useDispatchCampaigns()`, `useGroupCampaigns()` para dropdown de campanhas

### Sem migração de banco necessária
A tabela `leads` já possui `source_type`, `source_group_name`, `source_group_id`.

