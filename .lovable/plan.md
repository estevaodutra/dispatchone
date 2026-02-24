

# Fix: Toggle de disponibilidade dos operadores

## Problema identificado

Dois problemas no `handleToggle` do `OperatorCard` em `src/components/call-panel/OperatorsPanel.tsx`:

1. **`mutateAsync` chamado sem `await`** (linha 244): `updateOperatorStatus` é `mutateAsync`, que re-lança erros mesmo após o `onError` handler. Sem `await` ou `.catch()`, cria uma rejeição de promise não tratada que dispara o error overlay do Lovable.

2. **Chamadas diretas ao Supabase sem invalidar cache** (linhas 224-235, 238-241): Quando o operador está em `on_call` ou `cooldown`, o `handleToggle` faz `supabase.from("call_operators").update(...)` diretamente, mas não invalida o React Query cache (`["call_operators"]`). O banco atualiza mas a UI não reflete a mudança.

## Solucao

### Arquivo: `src/components/call-panel/OperatorsPanel.tsx`

Refatorar `handleToggle` no componente `OperatorCard` (linhas 217-245):

- Adicionar `await` na chamada de `updateOperatorStatus` na linha 244
- Adicionar `try/catch` em todo o `handleToggle` para capturar erros
- Após as chamadas diretas ao supabase (linhas 224-235), chamar `queryClient.invalidateQueries({ queryKey: ["call_operators"] })` para atualizar a UI
- Importar `useQueryClient` do tanstack e obter a instância dentro do `OperatorCard`

### Arquivo: `src/hooks/useCallOperators.ts`

Opcional mas recomendado: trocar `updateOperatorStatus` de `mutateAsync` para `mutate` (linha 200), já que ele é chamado fire-and-forget em vários lugares. Ou manter `mutateAsync` mas garantir que os chamadores usem `await`.

## Detalhes tecnicos

```text
handleToggle atual (linha 244):
  updateOperatorStatus({ id, status });  // sem await → unhandled rejection

handleToggle corrigido:
  try {
    await updateOperatorStatus({ id, status });
  } catch {} // erro já tratado pelo onError do mutation

Chamadas diretas (linhas 224-228, 231-235):
  await supabase.update(...)  // funciona
  // FALTANDO: queryClient.invalidateQueries(["call_operators"])
```

### Arquivos alterados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/call-panel/OperatorsPanel.tsx` | Adicionar await, try/catch, e invalidação de cache no handleToggle |

