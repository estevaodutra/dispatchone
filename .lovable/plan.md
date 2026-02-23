

# Sistema de Prioridade para Campanhas de Ligacao

## Visao Geral

Adicionar um toggle de prioridade nas campanhas de ligacao que permite posicionar as ligacoes a frente na fila. Campanhas prioritarias terao seus leads processados antes das campanhas normais pelo motor de execucao da fila.

## Mudancas Necessarias

### 1. Migracao de Banco de Dados

Adicionar 2 colunas na tabela `call_campaigns`:

```text
ALTER TABLE call_campaigns ADD COLUMN is_priority BOOLEAN DEFAULT false;
ALTER TABLE call_campaigns ADD COLUMN priority_position INT DEFAULT 3;
```

### 2. Hook `useCallCampaigns` (`src/hooks/useCallCampaigns.ts`)

- Adicionar `isPriority: boolean` e `priorityPosition: number` ao tipo `CallCampaign`
- Adicionar `is_priority` e `priority_position` ao tipo `DbCallCampaign`
- Atualizar `transformDbToFrontend` para mapear os novos campos
- Atualizar a mutacao `updateCampaign` para aceitar e converter `isPriority` e `priorityPosition`

### 3. Configuracao da Campanha (`src/components/call-campaigns/tabs/ConfigTab.tsx`)

Adicionar um novo Card "Prioridade" entre "Configuracoes Gerais" e "Execucao em Fila":

- Switch para habilitar/desabilitar prioridade
- Quando habilitado, mostrar campo numerico "Posicao na Fila" (1 a 5) com valor padrao 3
- Texto explicativo: "Quando habilitado, as ligacoes desta campanha entram a frente na fila, sendo posicionadas entre as proximas 5 ligacoes disponiveis."
- Incluir os novos campos no `handleSave` e `hasChanges`

### 4. Lista de Campanhas (`src/components/call-campaigns/CallCampaignList.tsx`)

- Mostrar icone de estrela antes do nome de campanhas prioritarias
- Exibir badge "PRIORIDADE" ao lado do status
- Mostrar a posicao configurada (ex: "Posicao: 3") nos detalhes do card

### 5. Motor de Execucao da Fila (`supabase/functions/queue-executor/index.ts`)

Modificar a logica de selecao do proximo lead na fila para considerar prioridade:

- **Passo 3a (ready call_logs)**: Alterar a query para ordenar por `is_priority DESC, scheduled_for ASC`, buscando primeiro os call_logs de campanhas prioritarias. Para isso, fazer um JOIN com `call_campaigns` para verificar `is_priority`.

- **Passo 3b (pending call_leads)**: Alterar a query para buscar primeiro leads de campanhas prioritarias. Usar uma abordagem em duas etapas: primeiro tentar buscar de campanhas prioritarias, depois de campanhas normais.

A logica de posicionamento sera simplificada: em vez de manipular positions fisicas na fila, campanhas prioritarias simplesmente serao processadas antes na ordenacao da query.

### 6. Painel de Ligacoes (`src/pages/CallPanel.tsx`)

- Atualizar `sortByPriority` para considerar `is_priority` como sub-criterio dentro do grupo "AGORA/Agendada"
- Exibir icone de estrela no nome da campanha na tabela quando a ligacao vem de campanha prioritaria

### 7. Hook `useCallPanel` (`src/hooks/useCallPanel.ts`)

- Adicionar campo `isPriority` ao tipo `CallPanelEntry`
- Buscar `is_priority` da campanha vinculada na query de call_logs (via join com `call_campaigns`)
- Passar o campo para a interface

## Detalhes Tecnicos

### Ordenacao no Queue Executor

A query atual:
```text
.eq('call_status', 'ready')
.order('scheduled_for', { ascending: true })
```

Sera substituida por uma abordagem que verifica primeiro se ha call_logs de campanhas prioritarias antes de processar as normais. Como o Supabase JS client nao suporta ORDER BY campo de tabela relacionada facilmente, a logica sera:

1. Buscar a lista de `campaign_ids` prioritarios do usuario
2. Tentar buscar um `ready` call_log de campanha prioritaria primeiro
3. Se nao encontrar, buscar o proximo `ready` normal

### Mesma logica para pending leads (3b):

1. Buscar campanhas prioritarias ativas do usuario
2. Tentar buscar lead pendente de campanha prioritaria primeiro
3. Se nao encontrar, buscar o proximo pendente normal

### Arquivos Modificados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| Migracao SQL | 2 novas colunas em `call_campaigns` |
| `src/hooks/useCallCampaigns.ts` | Novos campos no tipo e transformacao |
| `src/components/call-campaigns/tabs/ConfigTab.tsx` | Card de Prioridade na UI |
| `src/components/call-campaigns/CallCampaignList.tsx` | Badge e icone de prioridade |
| `supabase/functions/queue-executor/index.ts` | Ordenacao por prioridade |
| `src/pages/CallPanel.tsx` | Indicador visual de prioridade |
| `src/hooks/useCallPanel.ts` | Campo isPriority no tipo |
