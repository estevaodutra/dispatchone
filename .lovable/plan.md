

## Plano: Listagem cronológica e filtro "Todos" incluindo ligações em andamento

### Problema
1. A listagem usa `sortByPriority()` que agrupa por categoria de status (em andamento > agendadas > finalizadas), em vez de ordenar por data de criação (mais recente primeiro).
2. O filtro "Todos" já busca todos os status (incluindo `dialing`, `ringing`, `in_progress`), porém a ordenação por prioridade mascara a ordem cronológica.

### Alterações

**Arquivo: `src/pages/CallPanel.tsx`**

1. **Remover a função `sortByPriority`** (linhas 143-188) — não será mais usada.

2. **Substituir a linha 537** que aplica `sortByPriority`:
   ```typescript
   // Antes:
   const sortedEntries = useMemo(() => sortByPriority(isQueueTab ? [] : entries), [entries, isQueueTab]);
   
   // Depois:
   const sortedEntries = useMemo(() => {
     if (isQueueTab) return [];
     // Ordenação cronológica: mais recente primeiro (já vem do backend ordenado por created_at desc)
     return [...entries].sort((a, b) => 
       new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
     );
   }, [entries, isQueueTab]);
   ```

Isso garante que:
- A aba "Todos" mostra **todas** as ligações (incluindo as em andamento/discando) ordenadas do mais recente ao mais antigo.
- Os filtros individuais (Agendadas, Em andamento, etc.) também respeitam a ordem cronológica.
- O destaque visual por linha (`getRowClass`) continua funcionando, então ligações em andamento ainda terão a borda verde e fundo destacado, mesmo sem ficarem no topo.

### Impacto
- Apenas `src/pages/CallPanel.tsx` é alterado.
- A função `sortByPriority` é removida (código morto após a mudança).
- Nenhuma alteração no hook `useCallPanel` — os dados já vêm ordenados por `created_at desc` do banco.

