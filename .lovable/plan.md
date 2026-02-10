

# Adicionar coluna "Campanha" na importacao de leads

## O que sera feito

Ao importar leads via CSV, o usuario podera mapear uma coluna do arquivo para o campo "campanha", permitindo atribuicao automatica de leads a campanhas existentes. Alem disso, havera uma opcao de selecionar uma campanha padrao para todos os leads importados (similar as tags padrao).

## Alteracoes

### 1. `src/components/leads/ImportLeadsDialog.tsx`

**Adicionar campo de mapeamento "campanha":**
- Incluir `"campaign"` no tipo `MappingField`: `"ignore" | "name" | "phone" | "email" | "tags" | "campaign"`
- Adicionar opcao "Campanha" no `Select` de mapeamento de colunas
- Auto-map: colunas com nome contendo "campanha" ou "campaign" serao mapeadas automaticamente

**Adicionar selector de campanha padrao:**
- Abaixo das tags padrao, adicionar um `Select` com as campanhas disponiveis (de todos os tipos: despacho, ligacao, grupo, etc.)
- O usuario pode escolher uma campanha padrao para aplicar a todos os leads importados que nao tenham campanha definida na coluna

**Atualizar o `handleImport`:**
- Extrair o valor da coluna mapeada como `campaign` de cada linha
- Fazer match do nome da campanha com o ID (lookup nas campanhas carregadas)
- Passar `campaign_id` e `campaign_type` no payload de cada lead

**Atualizar a interface de props:**
- O `onImport` passara a incluir `campaignId?: string` e `campaignType?: string` em cada lead, e `defaultCampaignId?: string` + `defaultCampaignType?: string` nas opcoes

**Atualizar o template CSV:**
- Incluir coluna "campanha" no modelo: `nome,telefone,email,tags,campanha`

**Receber campanhas como prop:**
- Adicionar prop `campaigns` com lista de campanhas disponiveis (id, nome, tipo)

### 2. `src/hooks/useLeads.ts` — mutation `importLeads`

- Atualizar o tipo do parametro para aceitar `campaignId` e `campaignType` por lead
- Atualizar o tipo para aceitar `defaultCampaignId` e `defaultCampaignType`
- Na logica de insert, incluir `active_campaign_id` e `active_campaign_type` quando fornecidos (prioridade: valor do lead > valor padrao)

### 3. `src/pages/Leads.tsx`

- Importar e usar `useCallCampaigns`, `useDispatchCampaigns` e `useGroupCampaigns` para montar a lista unificada de campanhas
- Passar a lista como prop para o `ImportLeadsDialog`
- Atualizar a chamada do `onImport` para incluir os novos campos

## Detalhes tecnicos

- A resolucao campanha por nome sera feita no frontend: ao importar, o valor textual da coluna "campanha" sera comparado (case-insensitive) com os nomes das campanhas carregadas. Se encontrar match, usa o `id` e o `type`. Caso contrario, ignora.
- Campanhas de todos os tipos serao listadas no selector padrao, agrupadas por tipo (Ligacao, Despacho, Grupos).
- Nenhuma alteracao de banco necessaria -- os campos `active_campaign_id` e `active_campaign_type` ja existem na tabela `leads`.
