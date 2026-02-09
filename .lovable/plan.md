
# Ampliar status do endpoint /call-status e refletir no front-end

## Resumo

Expandir os status aceitos pelo endpoint `POST /call-status` de 3 para 8, e atualizar o front-end (CallPanel e API Docs) para exibir corretamente cada novo status.

## Novos status

| Status recebido (API) | Status interno (call_logs) | Label no front-end |
|---|---|---|
| `dialing` | `dialing` | Em ligacao |
| `answered` | `answered` | Atendida |
| `ended` | `completed` | Concluida |
| `busy` | `busy` | Ocupado |
| `not_found` | `not_found` | Numero nao encontrado |
| `voicemail` | `voicemail` | Caixa Postal |
| `cancelled` | `cancelled` | Cancelamento da Ligacao |
| `timeout` | `timeout` | Tempo Expirado |
| `error` | `failed` | Falhou |

## Alteracoes

### 1. Edge Function `supabase/functions/call-status/index.ts`

- Atualizar `VALID_STATUSES` para incluir todos os novos valores:
  ```text
  ['dialing', 'answered', 'ended', 'busy', 'not_found', 'voicemail', 'cancelled', 'timeout', 'error']
  ```

- Atualizar o `statusMap` para mapear cada status recebido para o status interno:
  ```text
  dialing -> dialing
  answered -> answered
  ended -> completed
  busy -> busy
  not_found -> not_found
  voicemail -> voicemail
  cancelled -> cancelled
  timeout -> timeout
  error -> failed
  ```

- Atualizar a logica de `started_at`/`ended_at`:
  - `answered`: setar `started_at` se ainda nao existir.
  - `busy`, `not_found`, `voicemail`, `cancelled`, `timeout`: setar `ended_at` e tratar como encerramento (sem duracao).
  - `error_message` sera gravado em `notes` para `error`, `not_found`, `voicemail` e `timeout`.

- Atualizar o mapeamento inline usado na criacao de novo call_log (linha ~423) para incluir os novos status.

- Atualizar a logica de lead status para os novos status:
  - `answered` -> lead fica `calling`
  - `busy`, `not_found`, `voicemail`, `cancelled`, `timeout` -> lead fica `failed`

### 2. Front-end `src/pages/CallPanel.tsx`

- **`getStatusCategory`**: Adicionar os novos status nas categorias corretas:
  - `in_progress`: adicionar `answered`
  - `completed`: manter `completed`
  - `cancelled`: adicionar `cancelled`
  - `failed`: adicionar `busy`, `not_found`, `voicemail`, `timeout`

- **Badge de status no `CallCard`**: Expandir o badge de `failed` para exibir labels granulares:
  ```text
  busy -> "Ocupado"
  not_found -> "Numero nao encontrado"
  voicemail -> "Caixa Postal"
  timeout -> "Tempo Expirado"
  no_answer -> "Nao atendeu"  (compatibilidade)
  fallback -> "Falhou"
  ```

- Adicionar badge especifico para `answered`:
  ```text
  answered -> Badge verde "Atendida"
  ```

### 3. API Docs `src/data/api-endpoints.ts`

- Atualizar o atributo `status` na descricao do endpoint `call-status`:
  - Mudar de `"Status da ligacao: 'dialing', 'ended' ou 'error'"` para listar todos os 9 valores aceitos.

- Atualizar os exemplos (curl, nodejs, python) para mostrar um dos novos status como alternativa.

## Detalhes tecnicos

Nenhuma alteracao de banco de dados e necessaria -- a coluna `call_status` da tabela `call_logs` e do tipo `text`, entao aceita qualquer valor sem migracao.
