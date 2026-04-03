

## Plano: Corrigir crash no seletor de lista na ação "Adicionar a uma Lista"

### Problema
Quando o usuário seleciona uma campanha no PollActionDialog com ação "Adicionar a uma Lista", a página crasha com o erro:
> `A <Select.Item /> must have a value prop that is not an empty string`

Causa: linha 159 renderiza `<SelectItem value="" disabled>` quando não há listas — Radix UI proíbe `value=""`.

### Alteração

**`src/components/group-campaigns/sequences/PollActionDialog.tsx`** — `AddToListConfig`:

1. **Linha 159**: Trocar `<SelectItem value="" disabled>` por `<SelectItem value="__empty__" disabled>` (ou usar um `<p>` fora do `SelectContent`)
2. **Linha 141**: Trocar `value={(config.listId as string) || ""}` por `value={(config.listId as string) || undefined}` para evitar que o Select tente resolver um valor vazio

### Arquivos
- `src/components/group-campaigns/sequences/PollActionDialog.tsx`

