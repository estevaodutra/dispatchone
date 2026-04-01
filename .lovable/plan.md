

## Plano: Corrigir loop infinito de autosave e dialog fechando

### Problema raiz
Ciclo infinito: autosave → `saveNodes` (deleta e re-insere nós no banco) → React Query refetch → `initialNodes` muda → `useEffect` sincroniza `localNodes` → autosave dispara de novo. Os IDs dos nós mudam a cada save (re-insert), então o `selectedNode` não é encontrado e o dialog fecha.

### Correções

**1. `src/components/sequences/UnifiedSequenceBuilder.tsx`**
- Trocar o `useEffect` de sincronização de `initialNodes` para só rodar **uma vez** (quando os dados carregam pela primeira vez), usando um ref `hasLoadedRef`
- Isso quebra o ciclo: após o load inicial, `localNodes` é a source of truth e não é sobrescrito por refetches
- Remover toast do autosave — o feedback visual ("Salvando..." / "Salvo") já é suficiente

**2. `src/components/group-campaigns/sequences/SequenceBuilder.tsx`**
- No `handleSave`: diferenciar save manual vs autosave. Passar flag `silent` ou simplesmente remover o `toast.success` do `handleSave` (já que o autosave indicator cobre isso)
- Alternativa mais simples: aceitar um parâmetro `silent?: boolean` no `onSave` e só mostrar toast quando é save manual

**3. `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`**
- Mesma correção: remover/condicionar toast no `handleSave`

### Detalhes técnicos

```text
// UnifiedSequenceBuilder.tsx — sync apenas no primeiro load
const hasLoadedRef = useRef(false);
useEffect(() => {
  if (!hasLoadedRef.current && initialNodes.length > 0) {
    setLocalNodes(initialNodes);
    hasLoadedRef.current = true;
  }
}, [initialNodes]);
```

```text
// SequenceBuilder.tsx — sem toast no save (autosave indicator basta)
const handleSave = async (name, nodes, connections) => {
  await onUpdate(...);
  await saveNodes(...);
  await saveConnections(...);
  // sem toast.success aqui — o indicador "Salvo ✓" no header cobre
};
```

### Impacto
- 3 arquivos, mudanças pequenas
- Elimina o loop infinito, o spam de toasts, e o dialog que fecha sozinho

