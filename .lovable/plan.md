

# Distribuicao igualitaria de ligacoes entre operadores

## Problema

Atualmente, a atribuicao de operadores nos tres pontos do sistema nao distribui as ligacoes de forma equilibrada:

- **Edge Function `call-dial`**: pega sempre o primeiro operador ativo (`.limit(1).single()`)
- **Edge Function `reschedule-failed-calls`**: escolhe aleatoriamente (`Math.random()`)
- **Hook `useCallPanel` (dialNow)**: pega o primeiro operador ativo quando redireciona

## Solucao: Round-robin baseado em contagem de call_logs

Em cada ponto de atribuicao, o sistema vai buscar todos os operadores ativos da campanha e selecionar aquele com **menor numero de ligacoes atribuidas** (contagem em `call_logs`). Em caso de empate, seleciona o primeiro da lista (por ordem de criacao).

## Alteracoes

### 1. Edge Function `supabase/functions/call-dial/index.ts`

Substituir a busca simples por operador (linhas 430-436) por uma logica de distribuicao:

- Buscar todos os operadores ativos da campanha
- Para cada operador, contar quantos `call_logs` existem com aquele `operator_id` naquela campanha
- Selecionar o operador com menor contagem

### 2. Edge Function `supabase/functions/reschedule-failed-calls/index.ts`

Substituir a selecao aleatoria (linhas 117-127) pela mesma logica:

- Buscar todos os operadores ativos da campanha
- Contar `call_logs` por operador naquela campanha
- Selecionar o de menor contagem

### 3. Hook `src/hooks/useCallPanel.ts` (dialNow mutation)

Substituir a busca do primeiro operador ativo (linhas 268-274) pela logica de distribuicao:

- Buscar todos os operadores ativos da campanha
- Contar `call_logs` por operador
- Selecionar o de menor contagem

## Detalhes tecnicos

A logica de selecao sera a mesma nos tres pontos. Para as Edge Functions (Deno/Supabase), a implementacao sera:

```text
1. SELECT * FROM call_campaign_operators WHERE campaign_id = X AND is_active = true
2. Para cada operador:
   SELECT count(*) FROM call_logs WHERE operator_id = op.id AND campaign_id = X
3. Selecionar o operador com menor count
4. Em caso de empate, manter a ordem de created_at (primeiro cadastrado)
```

Para o hook do frontend (`useCallPanel.ts`), a mesma logica sera feita via chamadas ao Supabase client.

Nenhuma alteracao de banco de dados e necessaria.
