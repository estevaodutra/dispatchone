

# Ajustar Retentativas Automaticas de Ligacoes

## Contexto

O sistema possui dois pontos de reagendamento:
1. **`call-status`** (Edge Function) -- ja implementa corretamente a logica de mesmo dia vs proximo dia util, com horario 09-19 BRT
2. **`reschedule-failed-calls`** (Edge Function) -- funciona como "varredura de seguranca" para pegar chamadas que escaparam do reagendamento inline, mas tem 3 problemas

## Problemas a Corrigir

### 1. Sem cron automatico
A funcao `reschedule-failed-calls` so executa quando chamada manualmente. Nao ha nenhum cron job configurado no banco.

**Correcao:** Criar um cron job via `pg_cron` + `pg_net` que dispara a funcao a cada 30 minutos durante o horario comercial.

### 2. Sempre agenda para o proximo dia
A funcao usa `getNextBusinessDay()` incondicionalmente, ignorando que falhas antes das 20h BRT poderiam ser reagendadas no mesmo dia (agora + 2h, se antes das 19h).

**Correcao:** Replicar a mesma logica de horario que ja existe no `call-status`:
- Se antes das 20h BRT e `agora + 2h < 19h BRT` -> agenda para o mesmo dia
- Senao -> proximo dia util

### 3. Faixa de horario 09-18 em vez de 09-19
O `generateRandomScheduledFor` gera horas de 9 a 18 (`Math.random() * 10 + 9`), mas a especificacao e ate 19h.

**Correcao:** Alterar para `Math.random() * 11 + 9` (9 a 19 inclusive como hora de inicio).

## Mudancas Tecnicas

### Arquivo: `supabase/functions/reschedule-failed-calls/index.ts`

1. **`generateRandomScheduledFor`**: Trocar `Math.random() * 10` por `Math.random() * 11` para cobrir 09:00-19:59
2. **Substituir chamada fixa a `getNextBusinessDay()`** por logica condicional:
   - Calcular hora atual em BRT
   - Se `hourBRT < 20` e `hourBRT + 2 < 19`, gerar timestamp para mesmo dia (agora + 2h)
   - Senao, usar proximo dia util com horario aleatorio
3. Manter toda a logica existente de limite de 3 tentativas, verificacao de duplicatas, e distribuicao de operadores

### Banco de Dados: Cron Job

Criar cron job usando `pg_cron` + `pg_net` para chamar `reschedule-failed-calls` a cada 30 minutos:
- Horario: `*/30 * * * *` (a cada 30 min, 24h -- a funcao ja filtra por horario internamente)
- Metodo: POST via `net.http_post` para a URL da Edge Function com o anon key

### Pre-requisito

Habilitar as extensoes `pg_cron` e `pg_net` no banco (se nao estiverem ativas).

