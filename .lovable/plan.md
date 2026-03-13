

## Reordenação de ações com drag-and-drop

### O que será feito
Adicionar arrastar e soltar (drag-and-drop) na lista de ações da aba "Ações" usando `@dnd-kit/core` + `@dnd-kit/sortable`. O hook `reorderActions` já existe e persiste a nova ordem no banco.

### Alterações

**1. Instalar `@dnd-kit`**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**2. Arquivo: `src/components/call-campaigns/tabs/ActionsTab.tsx`**
- Importar `DndContext`, `closestCenter`, `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `CSS` do dnd-kit
- Importar `reorderActions` do hook (já retornado mas não usado)
- Extrair cada item da lista em um componente `SortableActionItem` que usa `useSortable` para aplicar `transform`/`transition` e conectar o `GripVertical` como drag handle
- Envolver a lista com `DndContext` + `SortableContext` usando os IDs das ações
- No `onDragEnd`, reordenar o array local e chamar `reorderActions(newOrderedIds)`

