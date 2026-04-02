

## Plano: Corrigir carregamento inicial de nós na sequência

### Problema
No `TimelineSequenceBuilder`, o `useEffect` de sincronização (linha 66-72) marca `hasLoadedRef.current = true` quando `dbNodes.length === 0`, mas `dbNodes` começa como `[]` enquanto a query ainda está carregando. Isso faz com que, quando os dados reais chegam, o ref já está `true` e os nós nunca são carregados no estado local.

### Correção

**Arquivo: `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**

1. Extrair `isLoading` do hook `useSequenceNodes` (já disponível como retorno do hook)
2. Alterar o `useEffect` de sync para **não marcar como carregado quando `isLoading` é `true`**:

```typescript
const { nodes: dbNodes, isLoading: nodesLoading, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);

useEffect(() => {
  if (nodesLoading) return; // Don't mark as loaded while still fetching
  if (!hasLoadedRef.current) {
    if (dbNodes.length > 0) {
      setLocalNodes(dbNodes.map(n => ({ id: n.id, nodeType: n.nodeType, nodeOrder: n.nodeOrder, config: n.config })));
    }
    hasLoadedRef.current = true;
  }
}, [dbNodes, nodesLoading]);
```

1 arquivo, ~3 linhas alteradas.

