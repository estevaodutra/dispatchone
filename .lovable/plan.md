

## Plano: Múltiplas Listas de Execução por Campanha

### Problema atual
O hook `useGroupExecutionList` busca apenas uma lista (`.limit(1).maybeSingle()`) e a tab mostra uma única lista. O usuário precisa de várias listas por campanha (ex: uma para quem entrou, outra para respostas de enquete, outra para quem saiu).

### Abordagem
Refatorar para o padrão de lista + detalhe, similar a como Sequências funcionam (lista de cards → clique para ver detalhes/leads).

### Alterações

**1. `src/hooks/useGroupExecutionList.ts`**
- Renomear query para buscar **array** de listas: remover `.limit(1).maybeSingle()`, usar `.select("*")` retornando `GroupExecutionList[]`
- Mover query de leads para aceitar um `listId` específico (não mais atrelado a uma única lista)
- `createList` permanece igual
- `updateList`, `toggleActive`, `executeNow` permanecem iguais (já recebem `id`)
- Adicionar mutation `deleteList` para remover uma lista
- Retornar `{ lists, isLoading, createList, updateList, toggleActive, executeNow, deleteList, getLeads }`

**2. `src/components/group-campaigns/tabs/ExecutionListTab.tsx`** — Reescrever
- **Tela principal (lista):** grid de cards, cada card mostra: nome/eventos monitorados, tipo janela, ação, status (ativo/pausado), badge com contagem de leads pendentes. Botão "Nova Lista" no topo.
- **Tela de detalhe (ao clicar):** mostra os 4 cards de métricas, countdown, tabela de leads, botões Editar/Executar/Voltar — basicamente o conteúdo atual mas para a lista selecionada.
- Adicionar state `selectedList: GroupExecutionList | null` para alternar entre lista e detalhe.

**3. `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Adicionar campo **"Nome"** (obrigatório) para identificar a lista (ex: "Leads de entrada", "Respostas de enquete").
- Sem outras mudanças.

**4. Migration — Adicionar coluna `name`**
- `ALTER TABLE group_execution_lists ADD COLUMN name text NOT NULL DEFAULT 'Lista de Execução';`

### Arquivos
- Migration: adicionar coluna `name`
- `src/hooks/useGroupExecutionList.ts` — refatorar para array + delete
- `src/components/group-campaigns/tabs/ExecutionListTab.tsx` — reescrever com padrão lista/detalhe
- `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx` — adicionar campo nome

