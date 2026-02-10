
# Corrigir duplicidade de call_logs para o mesmo lead

## Problema

A edge function `call-dial` sempre cria um novo registro em `call_logs` sem verificar se ja existe um agendamento ativo (status "scheduled", "ready", "dialing", etc.) para o mesmo lead na mesma campanha. Isso gera cards duplicados no Painel de Ligacoes.

## Solucao

### 1. Edge Function `call-dial` - Verificar call_log existente antes de criar

Antes de inserir um novo `call_log` (linha ~465), verificar se ja existe um registro ativo para o mesmo `lead_id` e `campaign_id`:

- Buscar `call_logs` onde `lead_id = X`, `campaign_id = Y` e `call_status` esteja em `['scheduled', 'ready', 'dialing', 'ringing', 'answered', 'in_progress']`
- Se encontrar: **atualizar** o registro existente (novo `scheduled_for`, `operator_id`, resetar `call_status` para `scheduled`) em vez de criar um novo
- Se nao encontrar: criar normalmente como ja faz

### 2. Limpeza dos dados duplicados existentes

Executar uma migracao SQL para remover os `call_logs` duplicados ja existentes, mantendo apenas o mais recente de cada par `lead_id + campaign_id` quando ambos estiverem em status nao-final.

```text
Logica:
  Para cada (lead_id, campaign_id) com mais de 1 registro em status ativo:
    - Manter o mais recente (por created_at)
    - Deletar os demais
```

## Arquivos modificados

- `supabase/functions/call-dial/index.ts` - adicionar verificacao de call_log existente
- Migracao SQL - limpar duplicados existentes
