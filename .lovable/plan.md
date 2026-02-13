
# Registrar Logs de Dispatch na Pagina de Logs

## Problema

A Edge Function `execute-dispatch-sequence` registra logs na tabela `dispatch_sequence_logs`, mas a pagina de Logs (/logs) le apenas da tabela `group_message_logs`. Por isso, disparos feitos via acoes de ligacao (como "Tentei de Ligar") nunca aparecem na aba "Logs de Envio".

Os dados existem no banco -- ha 2 registros recentes em `dispatch_sequence_logs` com status "sent" -- mas a interface nao os exibe.

## Solucao

Modificar a Edge Function `execute-dispatch-sequence` para, alem de gravar em `dispatch_sequence_logs`, tambem inserir um registro na tabela `group_message_logs` com os campos necessarios para aparecer na pagina de Logs. Isso garante uma visao unificada de todos os envios em um unico lugar.

### Arquivo modificado

**`supabase/functions/execute-dispatch-sequence/index.ts`**

Apos o insert em `dispatch_sequence_logs` (linha ~373), adicionar um insert na tabela `group_message_logs` com os seguintes campos mapeados:

| Campo group_message_logs | Valor |
|---|---|
| `group_campaign_id` | campaignId |
| `user_id` | userId |
| `recipient_phone` | contactPhone |
| `status` | "sent" ou "failed" |
| `sent_at` | timestamp atual |
| `sequence_id` | sequenceId |
| `node_type` | step.message_type (text, image, etc.) |
| `node_order` | step.step_order |
| `campaign_name` | typedCampaign.name |
| `group_name` | contactName (nome do contato como referencia) |
| `instance_name` | instance.name |
| `instance_id` | instance.id |
| `error_message` | mensagem de erro (se falha) |
| `response_time_ms` | responseTimeMs |
| `payload` | payload enviado ao webhook |

### Detalhes tecnicos

A insercao em `group_message_logs` sera feita em paralelo com o insert em `dispatch_sequence_logs` usando `Promise.all`, sem impactar a performance. Erros no log unificado serao tratados silenciosamente para nao afetar o fluxo principal.

O mesmo tratamento sera aplicado no bloco de erro (catch, linha ~394), garantindo que falhas tambem aparecam nos logs unificados.
