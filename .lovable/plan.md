

## Diagnóstico

A enquete está sendo respondida, mas a ação `call_webhook` configurada não dispara porque **a enquete nunca foi registrada na tabela `poll_messages`**.

Confirmado no banco:
- Voto recebido referencia `pollMessageId: 3EB0B7095684BBEED809C2`
- O envio foi bem-sucedido (`group_message_logs` tem o registro com `zaapId` e `messageId` válidos)
- Mas **`poll_messages` não tem nenhuma linha** para esse ID
- **0 de 10 votos recentes** encontram match em `poll_messages` (problema sistêmico)
- `webhook-inbound` segue até a busca em `poll_messages`, não acha, e segue silenciosamente → resposta `{poll_processing: null}` exatamente como o usuário viu

### Causa raiz

Em `supabase/functions/execute-message/index.ts` (linhas 1029-1044), o INSERT em `poll_messages` usa:
```ts
message_id: externalMessageId || ""
```
A coluna `message_id` tem **UNIQUE INDEX** (`idx_poll_messages_message_id`). Quando alguma resposta da Z-API não traz `messageId` (só `zaapId`), o código grava `message_id=""`. A primeira gravação passa, todas as seguintes batem em violação UNIQUE e **falham silenciosamente** (o `console.error` existe mas os logs do edge function estão indisponíveis para depuração no painel).

Além disso, o `console.error` no catch do INSERT só aparece em logs — nenhum mecanismo expõe a falha. Sequências mais recentes podem também estar passando `messageId` válido mas ainda assim havendo outro motivo de falha (p.ex. `node_id` que não satisfaz FK), que precisa ser logado adequadamente.

## Solução

### 1. `supabase/functions/execute-message/index.ts`
- Não inserir em `poll_messages` se `externalMessageId` estiver vazio/null — usar `zaap_id` como chave primária de busca em vez disso, ou pular o registro com warning explícito
- Log mais verboso do erro de insert (incluindo payload) para diagnóstico futuro
- Garantir `message_id` único: se `externalMessageId` falta, usar `zaapId` como fallback (Z-API sempre retorna `zaapId`)

### 2. `supabase/functions/handle-poll-response/index.ts`
- Quando `pollMessage` não for encontrado, registrar erro mais explícito no `processing_error` do `webhook_events` em vez de retornar 404 silencioso
- Tentar resolver via `group_message_logs` como fallback: buscar `zaap_id`/`external_message_id` lá, encontrar o `node_id`, e reconstruir a action a partir de `sequence_nodes.config.optionActions`

### 3. `supabase/functions/webhook-inbound/index.ts` (linhas 149-216)
- Quando a busca em `poll_messages` falha, persistir esse fato em `webhook_events.processing_error` ("poll_message_not_registered: {pollMessageId}") em vez de deixar `processing_result=null` sem pista
- Tentar fallback também consultando `group_message_logs` para auto-registrar a enquete em `poll_messages` na primeira resposta recebida

### 4. Migration de backfill
- Migration que percorre `group_message_logs` com `node_type='poll'` e zaap_id/external_message_id válidos e que **não tenham** registro em `poll_messages`, e cria os registros faltantes lendo `optionActions` do `sequence_nodes` correspondente
- Isso recupera as 14+ enquetes recentes não registradas (incluindo a do screenshot) e permite que votos futuros para elas sejam processados

## Comportamento final

- Enquetes existentes não registradas serão recuperadas pela migration → próximos votos disparam `call_webhook` corretamente
- Novas enquetes terão registro garantido (fallback para `zaap_id` quando `messageId` ausente, sem risco de violação UNIQUE)
- Falhas serão visíveis via `processing_error` em `webhook_events`, não mais silenciosas
- Votos para enquetes ainda não registradas tentam fallback via `group_message_logs` → auto-registram → executam ação

