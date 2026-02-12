

# Correção Retroativa - Executar Limpeza de Operador Fixo

## Situação Atual

7 registros em `call_logs` com status `scheduled` ainda mostram operadores fixos (Estevão/Mauro) em vez de "Auto". A lógica nova já está no código, mas os dados antigos precisam ser corrigidos.

## Ações

Executar duas queries de UPDATE no banco de dados:

### 1. Limpar `operator_id` nos logs agendados

```sql
UPDATE call_logs
SET operator_id = NULL
WHERE call_status IN ('scheduled', 'ready', 'waiting_operator')
  AND operator_id IS NOT NULL;
```

### 2. Limpar `assigned_operator_id` nos leads pendentes

```sql
UPDATE call_leads
SET assigned_operator_id = NULL
WHERE status IN ('pending', 'scheduled')
  AND assigned_operator_id IS NOT NULL;
```

## Resultado

Todas as ligações agendadas passarão a exibir "Auto" na coluna Operador do painel, e o operador será atribuído somente no momento real da discagem.

