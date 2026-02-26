

## Dados encontrados

| Tabela | Registros |
|--------|-----------|
| leads | 2.754 |
| call_leads | 2.158 |
| call_logs | 1.814 |
| call_queue | 0 |
| dispatch_campaign_contacts | 1 |
| lead_campaign_history | 0 |

## Plano de exclusão

Executar DELETEs na ordem correta (tabelas dependentes primeiro):

1. **call_logs** — 1.814 registros (histórico de ligações)
2. **call_queue** — 0 registros
3. **call_leads** — 2.158 registros (leads das campanhas de ligação)
4. **dispatch_campaign_contacts** — 1 registro
5. **lead_campaign_history** — 0 registros
6. **leads** — 2.754 registros (leads principais)

Todas as exclusões serão feitas via operações de dados no banco (DELETE sem WHERE de user_id, removendo tudo). Nenhuma alteração de código necessária.

