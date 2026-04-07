

## Plano: Permitir múltiplas sequências com gatilho Webhook

### Problema
Atualmente, o `UnifiedSequenceList` bloqueia a criação de uma segunda sequência com o mesmo tipo de gatilho (mostra "em uso" e impede a seleção). Para webhook, faz sentido permitir múltiplas sequências.

### Alteração

**`src/components/sequences/UnifiedSequenceList.tsx`**

1. Alterar a lógica de `usedTriggerTypes` para excluir `"webhook"` do set de tipos bloqueados
2. Remover a validação no `handleCreate` que impede criação quando o gatilho já existe — mas apenas para webhook

Trecho principal:
```typescript
// Antes
const usedTriggerTypes = new Set(sequences.map(seq => getSequenceItem(seq).triggerType));

// Depois — webhook pode repetir
const usedTriggerTypes = new Set(
  sequences.map(seq => getSequenceItem(seq).triggerType).filter(t => t !== "webhook")
);
```

E no `handleCreate`:
```typescript
if (form.triggerType !== "webhook" && usedTriggerTypes.has(form.triggerType)) {
  toast.error("Já existe uma sequência com este gatilho");
  return;
}
```

### Arquivos
- `src/components/sequences/UnifiedSequenceList.tsx`

