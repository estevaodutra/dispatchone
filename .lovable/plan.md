

## Adicionar barra de pesquisa na listagem de grupos

### Alterações

**`src/components/group-campaigns/tabs/GroupsListTab.tsx`**
- Adicionar estado `searchTerm` 
- Importar `Search` do lucide-react e `Input` do UI
- Inserir campo de busca entre o header "Selecionar todos" e a lista de grupos (linha ~348)
- Filtrar `availableGroups` por `name` ou `phone` antes de renderizar
- Atualizar `toggleSelectAll` e contadores para usar a lista filtrada

**`src/components/pirate-campaigns/tabs/PirateGroupsTab.tsx`**
- Mesma lógica: adicionar busca na seção "Adicionar Grupos" para filtrar `unlinkedGroups`

### UI
- Input com ícone `Search` à esquerda, placeholder "Buscar grupos..."
- Posicionado logo acima da lista, entre o "Selecionar todos / Adicionar" e os itens
- Filtra por nome do grupo ou JID (case-insensitive)

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/components/group-campaigns/tabs/GroupsListTab.tsx` | Adicionar busca + filtro |
| `src/components/pirate-campaigns/tabs/PirateGroupsTab.tsx` | Adicionar busca + filtro |

