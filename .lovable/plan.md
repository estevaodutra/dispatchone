

## Plano: Corrigir scroll no popup de configuração

### Problema
O `DialogContent` base usa `display: grid` e `gap-4 p-6`. Mesmo com `p-0 gap-0` override, o `ScrollArea` com `flex-1` não recebe restrição de altura adequada dentro de grid, impedindo o scroll.

### Correção

**Arquivo:** `src/components/sequences/UnifiedNodeConfigPanel.tsx` (linha 258)

Adicionar `overflow-hidden` ao `DialogContent` e `min-h-0` ao `ScrollArea` para que o flex layout funcione corretamente com scroll:

```tsx
// Antes:
<DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
  ...
  <ScrollArea className="flex-1 px-6 pb-6">

// Depois:
<DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
  ...
  <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
```

- `overflow-hidden` no container impede que o conteúdo extrapole o `max-h`
- `min-h-0` no `ScrollArea` permite que o flex item encolha abaixo do tamanho do conteúdo, ativando o scroll

### Impacto
- 1 arquivo, 2 linhas alteradas
- O popup passará a ter scroll funcional quando o conteúdo exceder 85vh

