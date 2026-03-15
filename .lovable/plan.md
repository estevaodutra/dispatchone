

## Re-deploy da Edge Function `webhook-inbound`

### Diagnóstico
O código no repositório está **correto** — a extração do participante real de `notificationParameters` está implementada nas linhas 402-408. Porém, a edge function deployada **não contém essas alterações**. Evidências:

1. Os eventos `group_join` recentes (19:14, 19:03 UTC) ainda têm `sender_phone` = JID do grupo (ex: `120363406647107801-group`)
2. Nenhum log contendo "Detected group_join" ou "Pirate process result" aparece nos logs da função
3. A tabela `pirate_leads` continua vazia (0 leads)

### Solução
Forçar o re-deploy da edge function `webhook-inbound` para que as alterações já presentes no código (extração de participante e invocação do `pirate-process-join`) entrem em vigor.

Também re-deployar `pirate-process-join` para garantir que ambas as funções estejam sincronizadas.

### Resultado Esperado
Após o deploy, novos eventos `group_join` devem:
- Salvar `sender_phone` com o LID/número do participante (ex: `75441268367584`) em vez do JID do grupo
- Invocar `pirate-process-join` automaticamente
- Criar registros em `pirate_leads` para campanhas ativas que monitoram o grupo
- Disparar o webhook para o n8n com os dados do participante

### Ação
- Re-deploy: `webhook-inbound` e `pirate-process-join`

