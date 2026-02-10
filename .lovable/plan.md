

# Reagendamento imediato apos falha (apos 20h) com limite de 3 tentativas

## Resumo

Duas alteracoes principais:

1. **No `call-status`**: quando qualquer ligacao falhar (busy, voicemail, not_found, timeout, error) e o horario for apos 20h (Brasilia), reagendar imediatamente para o proximo dia util com operador aleatorio.
2. **Limite de 3 reagendamentos**: tanto no `call-status` quanto no `reschedule-failed-calls`, contar quantas vezes o lead ja foi reagendado na campanha e parar apos 3 tentativas.

## Status que disparam reagendamento

Todos os status de falha: `busy`, `voicemail`, `not_found`, `timeout`, `error`/`failed`. Nao inclui `cancelled` (cancelamento manual).

## Como funciona o limite de 3 tentativas

Antes de reagendar, contar quantos `call_logs` com status `*_rescheduled` existem para o mesmo `lead_id` + `campaign_id`. Se >= 3, nao reagenda mais.

## Alteracoes

### 1. `supabase/functions/call-status/index.ts`

Apos a secao de atualizacao do lead status (linha ~517), adicionar bloco:

- Verificar se `mappedStatus` e um dos status de falha (nao inclui `completed`, `dialing`, `answered`, `cancelled`)
- Verificar se horario de Brasilia >= 20h
- Se sim:
  - Contar reagendamentos anteriores do lead na campanha (status terminando em `_rescheduled`)
  - Se count >= 3: nao reagenda, loga que atingiu limite
  - Se count < 3:
    - Calcular proximo dia util
    - Gerar horario aleatorio 9h-19h
    - Buscar operadores ativos e sortear um
    - Inserir novo `call_log` com status `scheduled`
    - Atualizar lead para `pending` com novo operador
    - Marcar call_log original como `{status}_rescheduled`
- Adicionar campo `rescheduled: true` na resposta quando aplicavel

### 2. `supabase/functions/reschedule-failed-calls/index.ts`

Adicionar a mesma verificacao de limite de 3 tentativas:

- Antes de criar o reagendamento, contar `call_logs` com status `*_rescheduled` para o mesmo `lead_id` + `campaign_id`
- Se count >= 3: pular esse lead e nao reagendar

## Fluxo

```text
Ligacao falha -> call-status recebe status de falha
  -> Atualiza call_log e lead normalmente
  -> Verifica: horario >= 20h BRT?
     -> SIM:
        -> Contagem de reagendamentos < 3?
           -> SIM: Reagenda imediatamente (proximo dia util, 9h-19h, operador aleatorio)
           -> NAO: Nao reagenda (limite atingido)
     -> NAO: Nao faz nada (o cron noturno cuidara)

Cron noturno (reschedule-failed-calls):
  -> Para cada ligacao com falha:
     -> Contagem de reagendamentos < 3?
        -> SIM: Reagenda
        -> NAO: Pula
```

## Detalhes tecnicos

- A contagem usa: `SELECT count(*) FROM call_logs WHERE lead_id = X AND campaign_id = Y AND call_status LIKE '%_rescheduled'`
- As funcoes auxiliares `getNextBusinessDay()` e `generateRandomScheduledFor()` serao duplicadas no `call-status` (mesma logica do `reschedule-failed-calls`)
- O `call-status` ja usa `service_role`, entao pode acessar `call_campaign_operators` sem problemas

## Arquivos modificados

- `supabase/functions/call-status/index.ts` - adicionar logica de reagendamento imediato com limite
- `supabase/functions/reschedule-failed-calls/index.ts` - adicionar verificacao de limite de 3 tentativas

