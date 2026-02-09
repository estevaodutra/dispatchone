

# Adicionar campo `audio_url` ao endpoint /call-status e exibir nos detalhes

## Resumo

Adicionar um campo opcional `audio_url` no endpoint `/call-status` para receber a URL da gravacao da chamada. Esse campo sera salvo na tabela `call_logs` e exibido no dialogo de detalhes da ligacao com um player de audio nativo.

## Alteracoes

### 1. Banco de dados -- nova coluna

Adicionar coluna `audio_url` (text, nullable) na tabela `call_logs`:

```sql
ALTER TABLE public.call_logs ADD COLUMN audio_url text;
```

### 2. Edge Function `supabase/functions/call-status/index.ts`

- Extrair `audio_url` do body do request (junto com os outros campos na linha 90).
- Ao montar o `updateData` (linha ~454), incluir `audio_url` se presente.
- Ao criar novo call_log (linha ~418), incluir `audio_url` se presente.

### 3. Hook `src/hooks/useCallPanel.ts`

- Adicionar `audioUrl: string | null` na interface `CallPanelEntry`.
- Adicionar `audio_url` na interface `DbCallLogJoined`.
- Mapear `audio_url` para `audioUrl` no `transformEntry`.

### 4. Front-end `src/pages/CallPanel.tsx`

- No `ActionDialog`, exibir um player de audio quando `entry.audioUrl` estiver presente.
- Usar a tag `<audio>` nativa do HTML com controles, posicionado acima das abas de roteiro/acao.

### 5. API Docs `src/data/api-endpoints.ts`

- Adicionar o atributo `audio_url` na lista de atributos do endpoint `call-status` como opcional, tipo `string`, com descricao "URL da gravacao da chamada (facultativo)".
- Atualizar os exemplos de request para incluir `audio_url` como campo opcional.

## Detalhes tecnicos

- A coluna e nullable e sem default, nao quebra dados existentes.
- O campo e puramente facultativo: se nao vier no request, nada muda.
- O player de audio aparece somente quando a URL existe.

