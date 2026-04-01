

## Plano: Remover toast do auto-save

### Problema
O `updateSequence` mutation em `useSequences.ts` (linha 196) mostra toast "Atualizado - Sequência atualizada com sucesso" no `onSuccess`. Como o autosave chama `updateSequence` continuamente, o toast aparece repetidamente.

Mesmo problema em `useDispatchSequences.ts` — o update mutation não tem toast de sucesso explícito, mas vale verificar.

### Correção

**Arquivo: `src/hooks/useSequences.ts` (linha 196)**
- Remover o `toast` do `onSuccess` do `updateMutation`
- Manter apenas o `queryClient.invalidateQueries`
- Manter toasts de erro intactos

```tsx
// Antes:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
  toast({ title: "Atualizado", description: "Sequência atualizada com sucesso." });
},

// Depois:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
},
```

### Impacto
- 1 arquivo, 1 linha removida
- Toasts de criação, deleção e duplicação permanecem (ações manuais)
- Apenas o toast de update (autosave) é removido

