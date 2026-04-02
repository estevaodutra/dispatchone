

## Plano: Adicionar "Criar Grupo" na categoria Gestão de Grupo

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**

1. Importar ícone `Plus` do `lucide-react`
2. Adicionar `{ type: "group_create", label: "Criar Grupo", icon: Plus }` como primeiro item da categoria "Gestão de Grupo"

**Arquivo: `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**

3. Adicionar config default para `group_create` no `getDefaultConfig` (nome do grupo e lista de participantes)

1-2 linhas por arquivo.

