

# Correção Retroativa - Remover Operador Fixo de Ligações Não Realizadas

## Dados Encontrados

- **`call_logs`**: 7 registros com `call_status` = `scheduled` e `operator_id` preenchido (5 para um operador, 2 para outro)
- **`call_leads`**: 20+ registros com `status` = `pending` ou `scheduled` e `assigned_operator_id` preenchido

## Correções a Executar

Duas queries de UPDATE para limpar os dados inconsistentes:

### 1. `call_logs` - Limpar operator_id de ligações agendadas

```sql
UPDATE call_logs
SET operator_id = NULL
WHERE call_status IN ('scheduled', 'ready', 'waiting_operator')
  AND operator_id IS NOT NULL;
```

### 2. `call_leads` - Limpar assigned_operator_id de leads pendentes

```sql
UPDATE call_leads
SET assigned_operator_id = NULL
WHERE status IN ('pending', 'scheduled')
  AND assigned_operator_id IS NOT NULL;
```

## Resultado

Após a execução, todas as ligações que ainda não foram realizadas aparecerão como **"Auto"** no painel, e o operador será atribuído somente no momento da discagem real.

