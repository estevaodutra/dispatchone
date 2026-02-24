

## Plano: Ordenação híbrida — ligações ativas no topo, depois cronológico

### Entendimento
O usuário quer:
1. **Ligações em andamento** (`dialing`, `ringing`, `in_progress`) sempre no topo.
2. **Próximas a ligar** (`ready`, `scheduled`) logo abaixo.
3. **Demais** (completed, cancelled, failed, no_answer, etc.) por último.
4. **Dentro de cada grupo**, ordenar do mais recente para o mais antigo (`createdAt` desc).

### Alteração

**Arquivo: `src/pages/CallPanel.tsx`** — linhas 490-495

Substituir a ordenação puramente cronológica por uma ordenação híbrida com 3 faixas de prioridade:

```typescript
const sortedEntries = useMemo(() => {
  if (isQueueTab) return [];

  const getPriority = (status: string) => {
    if (['dialing', 'ringing', 'in_progress'].includes(status)) return 0;
    if (['ready', 'scheduled', 'waiting_operator'].includes(status)) return 1;
    return 2;
  };

  return [...entries].sort((a, b) => {
    const pa = getPriority(a.status);
    const pb = getPriority(b.status);
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}, [entries, isQueueTab]);
```

### Resultado
- **Aba "Todos"**: mostra primeiro quem está ligando agora, depois os próximos na fila, depois finalizados — tudo cronológico dentro de cada grupo.
- **Abas filtradas** (ex: "Em andamento"): como só têm um tipo de status, a ordenação será puramente cronológica.
- Nenhum outro arquivo é alterado.

