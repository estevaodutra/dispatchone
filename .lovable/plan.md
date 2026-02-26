

## Excluir todos os dados de leads e dependências

A tabela `leads` já está vazia, mas existem dados órfãos nas tabelas dependentes:

- `call_logs`: 654 registros
- `call_leads`: 643 registros
- `call_queue`, `dispatch_campaign_contacts`, `lead_campaign_history`: já vazios

### Passos

1. **Excluir `call_logs`** (654 registros) — depende de `call_leads`, precisa ser excluído primeiro
2. **Excluir `call_leads`** (643 registros) — após `call_logs` ser limpo

Apenas essas duas tabelas precisam de limpeza.

