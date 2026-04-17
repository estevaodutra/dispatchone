

Plano: usar o componente `DataTableWithPagination` (já existe no projeto, em `src/components/dispatch/`) ou paginação inline no `ExecutionListDetail`. Como a tabela atual já é simples (Table do shadcn) e o resto da UI segue padrão similar, vou aplicar paginação inline consistente com o resto do app.

### Alteração

**`src/components/group-campaigns/tabs/ExecutionListTab.tsx`** — `ExecutionListDetail`

- Remover lógica `showAll` / `displayedLeads.slice(0, 10)` e o botão "Ver todos"
- Adicionar estado `currentPage` e `itemsPerPage` (default 25)
- Calcular `paginatedLeads = leads.slice((page-1)*itemsPerPage, page*itemsPerPage)`
- Resetar `currentPage` quando `leads.length` mudar significativamente (novo lead via realtime)
- Renderizar abaixo da tabela:
  - Select de "itens por página" (25 / 50 / 100)
  - Componente `Pagination` (shadcn `src/components/ui/pagination.tsx`) com Previous / páginas numeradas / Next
  - Texto "Exibindo X-Y de Z leads"
- Lógica de páginas visíveis: até 5 páginas com ellipses quando passa disso (mesmo padrão do `DataTableWithPagination`)
- Esconder paginação quando `leads.length <= itemsPerPage`

### Comportamento

- Lista de 40 leads (caso atual): 25 por página → 2 páginas
- Funciona tanto para listas fulltime (24h) quanto cíclicas
- Mantém o card de "Total de leads" intacto
- Sem alterações em hooks ou backend

