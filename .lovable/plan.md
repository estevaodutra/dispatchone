

# Reagendamento automatico diario de ligacoes com falha

## Resumo

Criar uma Edge Function que roda automaticamente uma vez por dia (via pg_cron), identifica todas as ligacoes que nao foram realizadas com sucesso, e reagenda cada uma para o proximo dia util (segunda a sexta) com horario aleatorio entre 9:00 e 19:00 (fuso de Brasilia).

## Como funciona

1. Todo dia, a funcao verifica ligacoes com status de falha (no_answer, busy, failed, voicemail, timeout, not_found)
2. Pula ligacoes ja concluidas (completed) ou canceladas manualmente (cancelled)
3. Para cada ligacao com falha, calcula o proximo dia util (seg-sex)
4. Gera um horario aleatorio entre 09:00 e 19:00
5. Cria um NOVO registro em call_logs com status "scheduled" e o horario calculado
6. Atualiza o status do lead de volta para "pending"
7. Registra o reagendamento nos logs

## Regras de negocio

- Apenas dias uteis: segunda a sexta
- Janela de horario: 09:00 as 19:00 (Brasilia)
- Distribuicao aleatoria: cada ligacao recebe um horario aleatorio dentro da janela
- Se hoje for sexta, reagenda para segunda
- Se hoje for sabado, reagenda para segunda
- Se hoje for domingo, reagenda para segunda
- Apenas ligacoes do dia anterior ou mais antigas com status de falha
- Nao reagenda ligacoes ja canceladas manualmente

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/reschedule-failed-calls/index.ts`

A funcao:
- Conecta ao banco com service role
- Busca todas as ligacoes com call_status em ('no_answer', 'busy', 'failed', 'voicemail', 'timeout', 'not_found') que ainda nao foram reagendadas
- Para cada ligacao:
  - Calcula o proximo dia util
  - Gera horario aleatorio (9h-19h) no fuso America/Sao_Paulo
  - Cria novo call_log com status "scheduled", mesmo campaign_id, lead_id e operator_id
  - Atualiza o lead para status "pending"
- Retorna relatorio com quantas ligacoes foram reagendadas

### 2. Configuracao em `supabase/config.toml`

Adicionar:
```
[functions.reschedule-failed-calls]
verify_jwt = false
```

### 3. Migracao SQL: pg_cron job

Criar um cron job que executa a funcao todo dia as 21:00 (horario de Brasilia), apos o fim do expediente. Isso garante que todas as ligacoes do dia que falharam sejam processadas.

```
cron.schedule(
  'reschedule-failed-calls-daily',
  '0 0 * * *',  -- meia-noite UTC = 21h Brasilia
  ...
)
```

### 4. Logica de calculo do proximo dia util

```text
Se hoje = sexta (5) -> proximo = segunda (+3 dias)
Se hoje = sabado (6) -> proximo = segunda (+2 dias)
Se hoje = domingo (0) -> proximo = segunda (+1 dia)
Senao -> proximo = amanha (+1 dia)
```

### 5. Logica de horario aleatorio

Para cada ligacao gera um timestamp com:
- Hora: aleatoria entre 9 e 18 (para que com minutos nao passe de 19h)
- Minuto: aleatorio entre 0 e 59
- Segundo: 0

## Arquivos

- **Novo:** `supabase/functions/reschedule-failed-calls/index.ts`
- **Editado:** `supabase/config.toml` (adicionar entrada da funcao)
- **Nova migracao SQL:** cron job para execucao diaria

