

# Correção Retroativa + Verificação do Fluxo de Discagem

## 1. Limpeza dos Dados Antigos

Os 7 registros em `call_logs` com status `scheduled` ainda mostram operadores fixos. Precisamos executar duas queries:

### Query 1: Limpar operator_id nos logs agendados
```sql
UPDATE call_logs
SET operator_id = NULL
WHERE call_status IN ('scheduled', 'ready', 'waiting_operator')
  AND operator_id IS NOT NULL;
```

### Query 2: Limpar assigned_operator_id nos leads pendentes
```sql
UPDATE call_leads
SET assigned_operator_id = NULL
WHERE status IN ('pending', 'scheduled')
  AND assigned_operator_id IS NOT NULL;
```

Resultado: todas as ligacoes agendadas passarao a exibir "Auto" no painel.

## 2. Comportamento na Hora de Ligar

O sistema ja funciona assim:

| Cenario | O que acontece |
|---|---|
| **Fila em execucao** (botao "Iniciar" ativo na campanha) | O `queue-executor` discarga **automaticamente**, busca operador disponivel via round-robin, cria o log e inicia a chamada |
| **Discagem manual** (botao "Discar agora" no painel) | O usuario clica manualmente; se houver operador disponivel, disca; se nao houver, enfileira como `waiting_operator` |
| **Nenhum operador disponivel** | A ligacao fica com status `waiting_operator` ate que um operador fique disponivel |

Nenhuma alteracao de codigo e necessaria — apenas a limpeza dos dados antigos.

## Resumo

| Acao | Tipo |
|---|---|
| Executar 2 queries de UPDATE no banco | Correcao de dados |
| Nenhuma alteracao de codigo | -- |

