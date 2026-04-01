

## Plano: Sincronizar nós carregados do banco no canvas

### Problema
`UnifiedSequenceBuilder` usa `useState<LocalNode[]>(initialNodes)` (linha 46). O `useState` do React ignora mudanças em `initialNodes` após a montagem. Quando os nós são carregados assincronamente do banco, o canvas permanece vazio.

### Correção

**Arquivo:** `src/components/sequences/UnifiedSequenceBuilder.tsx`

Adicionar um `useEffect` que sincroniza `localNodes` e `localConnections` quando `initialNodes`/`initialConnections` mudam (dados carregados do DB):

```typescript
useEffect(() => {
  setLocalNodes(initialNodes);
}, [initialNodes]);

useEffect(() => {
  setLocalConnections(initialConnections);
}, [initialConnections]);
```

Também importar `useEffect` do React.

### Impacto
- 1 arquivo, ~6 linhas adicionadas
- Resolve o canvas vazio para sequências que já possuem nós salvos

