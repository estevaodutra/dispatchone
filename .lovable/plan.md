

# Otimizar mecanismos de busca no Painel de Ligacoes

## Problema

A busca por "6578" nao retorna resultados por dois motivos:

1. **Aba "Fila"**: O hook `useCallQueuePanel` nao aplica nenhum filtro de busca. Os itens da fila sao exibidos sem considerar o campo de busca.
2. **Aba "Chamadas"**: O hook `useCallPanel` faz a busca apenas no lado do cliente (client-side), sobre no maximo 200 registros retornados do banco. Se o lead com "6578" nao estiver entre esses 200, ele nunca sera encontrado. Alem disso, a busca por telefone usa `includes` simples, sem normalizar o numero (ex: remover "55", "+", etc.).

## Solucao

### 1. Adicionar filtro de busca na aba "Fila" (`src/hooks/useCallQueuePanel.ts`)

- Aceitar um parametro `searchQuery?: string` no hook.
- Filtrar os resultados (client-side) por nome ou telefone do lead, usando busca normalizada.
- Aplicar o filtro tanto nos `regularEntries` (call_queue) quanto nos `readyEntries` (call_logs com status ready).

### 2. Melhorar a busca no hook de chamadas (`src/hooks/useCallPanel.ts`)

- Normalizar o termo de busca removendo caracteres nao numericos antes de comparar com o telefone.
- Normalizar tambem o telefone do lead antes de comparar.
- Isso permite que "6578" encontre "5511965780000" ou "+55 11 96578-0000".

### 3. Passar `searchQuery` para o hook da fila (`src/pages/CallPanel.tsx`)

- Alterar a chamada de `useCallQueuePanel(campaignFilter)` para `useCallQueuePanel(campaignFilter, searchQuery)`.

## Detalhes Tecnicos

**`src/hooks/useCallQueuePanel.ts`** -- Adicionar filtragem:
```text
export function useCallQueuePanel(campaignFilter?: string, searchQuery?: string) {
  // ... fetch data as before ...

  // After combining regularEntries + readyEntries:
  let combined = [...regularEntries, ...readyEntries];

  if (searchQuery) {
    const s = searchQuery.toLowerCase();
    const sDigits = s.replace(/\D/g, "");
    combined = combined.filter(e => {
      const nameMatch = e.leadName?.toLowerCase().includes(s);
      const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
      const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
      return nameMatch || phoneMatch;
    });
  }

  return combined;
}
```

**`src/hooks/useCallPanel.ts`** -- Normalizar busca por telefone:
```text
if (filters?.search) {
  const s = filters.search.toLowerCase();
  const sDigits = s.replace(/\D/g, "");
  results = results.filter((e) => {
    const nameMatch = e.leadName?.toLowerCase().includes(s);
    const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
    const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
    return nameMatch || phoneMatch;
  });
}
```

**`src/pages/CallPanel.tsx`** -- Passar searchQuery ao hook da fila:
```text
const { entries: queueEntries, ... } = useCallQueuePanel(
  campaignFilter !== "all" ? campaignFilter : undefined,
  searchQuery || undefined
);
```

## Resultado

- Buscar "6578" vai encontrar qualquer lead cujo telefone contenha esses digitos, independente de formatacao ou codigo de pais.
- A busca passa a funcionar tanto na aba "Chamadas" quanto na aba "Fila".
