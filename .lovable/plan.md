

# Corrigir Foreign Key que Bloqueia Logs de Dispatch

## Problema Encontrado

A tabela `group_message_logs` possui uma foreign key:
```
group_campaign_id -> group_campaigns(id) ON DELETE CASCADE
```

Quando a Edge Function tenta inserir um log de dispatch, ela passa o ID da campanha de dispatch (tabela `dispatch_campaigns`) no campo `group_campaign_id`. Esse UUID nao existe na tabela `group_campaigns`, causando violacao de foreign key e o insert falha silenciosamente.

## Evidencia

- `dispatch_sequence_logs`: 5 registros recentes (funciona)
- `group_message_logs` com `recipient_phone` preenchido: apenas 3 registros antigos de janeiro (antes da FK existir ou de outro contexto)
- Nenhum registro de dispatch de fevereiro em `group_message_logs`
- FK confirmada: `group_message_logs_group_campaign_id_fkey FOREIGN KEY (group_campaign_id) REFERENCES group_campaigns(id) ON DELETE CASCADE`

## Solucao

### Migracao SQL

Remover a foreign key constraint de `group_campaign_id`, pois a tabela agora e um log unificado que armazena IDs de campanhas de grupo E de dispatch:

```sql
ALTER TABLE group_message_logs 
  DROP CONSTRAINT group_message_logs_group_campaign_id_fkey;
```

### Re-deploy da Edge Function

Forcar o re-deploy de `execute-dispatch-sequence` para garantir que a versao com error handling explicito esteja ativa.

### Validacao

Apos a correcao:
1. Disparar uma execucao para o lead Estevao
2. Verificar nos logs da Edge Function se aparece o erro ou o sucesso
3. Confirmar que o registro aparece em `group_message_logs`
4. Verificar na pagina /logs se o registro aparece na tabela unificada

## Nenhuma alteracao de codigo necessaria

Apenas a migracao SQL e o re-deploy. O codigo da Edge Function e da pagina de Logs ja estao corretos.

