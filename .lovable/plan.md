

## Plano: Adicionar paginacao na aba Membros

### Resumo
Adicionar paginacao client-side na tabela de membros, seguindo o mesmo padrao ja usado no projeto (`DataTableWithPagination`): seletor de itens por pagina (25/50/100), controles de navegacao, e indicador de range.

### Alteracoes

**`src/components/group-campaigns/tabs/MembersTab.tsx`**

1. Adicionar estados `currentPage` e `itemsPerPage` (default 50)
2. Calcular `paginatedMembers` a partir de `filteredMembers` usando slice
3. Resetar `currentPage` para 1 quando `searchTerm` mudar
4. Renderizar `paginatedMembers` no TableBody (em vez de `filteredMembers`)
5. Adicionar bloco de paginacao abaixo da tabela com:
   - Seletor "Itens por pagina" (25/50/100)
   - Indicador "(1-50 de 679)"
   - Botoes Previous/Next e numeros de pagina com ellipsis
   - Usar componentes `Pagination*` e `Select` ja existentes no projeto

Nenhum outro arquivo precisa ser alterado.

