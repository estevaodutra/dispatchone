

# Distribuir reagendamentos aleatoriamente entre operadores ativos

## Problema atual

A funcao `reschedule-failed-calls` reutiliza o mesmo `operator_id` da ligacao original. Se o operador estiver inativo ou sobrecarregado, as ligacoes continuam concentradas nele.

## Solucao

Alterar a Edge Function para, antes de inserir cada reagendamento, buscar todos os operadores ativos da campanha (`call_campaign_operators` com `is_active = true`) e sortear um aleatoriamente.

## Alteracao

**Arquivo:** `supabase/functions/reschedule-failed-calls/index.ts`

Dentro do loop de cada ligacao com falha, antes de inserir o novo `call_log`:

1. Buscar operadores ativos da campanha:
   ```
   SELECT id FROM call_campaign_operators
   WHERE campaign_id = [campaign_id] AND is_active = true
   ```

2. Se houver operadores ativos, sortear um aleatoriamente:
   ```
   operadores[Math.floor(Math.random() * operadores.length)]
   ```

3. Se nao houver operadores ativos, manter o `operator_id` original como fallback.

4. Usar o operador sorteado no insert do novo `call_log` e tambem atualizar o `assigned_operator_id` do lead.

## Resultado

Cada ligacao reagendada sera atribuida a um operador ativo diferente de forma aleatoria, distribuindo a carga de trabalho entre a equipe.

