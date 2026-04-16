

## Diagnóstico

A tabela `webhook_events` confirma que **44 eventos `group_join` chegaram** corretamente nas últimas 3 horas, todos com classificação correta, `instance_id`, `user_id` e `chat_jid` preenchidos. O grupo `120363408661213011-group` (campanha "Jonathan") tem campaign_groups vinculado corretamente.

**MAS** os logs do `webhook-inbound` mostram que NENHUMA das `console.log` dos blocos "Detected group_join" (linha 239) ou "Found N linked campaigns" (linha 286) foi executada. E os logs do `sync-group-members` estão **completamente vazios**.

Isto significa que a **versão deployada do `webhook-inbound` não está executando o bloco de auto-sync** — provavelmente um problema de deploy ou o bloco foi adicionado mas a edge function não foi redeployada.

Adicionalmente, eventos `GROUP_PARTICIPANT_INVITE` (entrada por link) trazem o **LID** em `notificationParameters[0]` e `phone = JID do grupo`. O `extractContext` extrai `senderLid` corretamente e zera `senderPhone`, mas a condição atual no `webhook-inbound` (`context.senderPhone || context.senderLid`) deveria funcionar — confirmando que o problema é apenas o deploy.

## Solução

### 1. Forçar redeploy do `webhook-inbound`
A versão em produção não está executando o bloco de auto-sync. Vou redeployar para garantir que o código atual (com o bloco AUTO-SYNC GROUP MEMBERS na linha 269-340) entre em vigor.

### 2. Adicionar logs de diagnóstico extras
Adicionar `console.log` antes da condição da linha 272-277 para confirmar quando a função é/não é chamada e por quê:
```typescript
console.log(`[webhook-inbound] group event check: type=${classification.eventType}, jid=${context.chatJid}, phone=${context.senderPhone}, lid=${context.senderLid}, userId=${instance?.user_id}`);
```

### 3. Reprocessar os eventos `group_join` que ficaram sem sync
Após confirmar que o auto-sync está ativo, disparar manualmente um `sync-group-members` para a campanha Jonathan (`261d7ef9-51ea-4ed0-a574-b1a34d8f10e3`) com o JID `120363408661213011-group` para popular os ~10+ membros que entraram via link nas últimas horas.

### 4. (Bônus de robustez) Disparar sync mesmo sem phone/lid
Para entradas via link onde nem `senderPhone` nem `senderLid` foram extraídos por algum motivo, ainda vale chamar o sync — basta haver `chatJid` e `instance.user_id`. Vou afrouxar a condição para:
```typescript
if ((eventType === "group_join" || eventType === "group_leave") && context.chatJid && instance?.user_id)
```
Removendo o requisito `(senderPhone || senderLid)`, já que o sync recupera todos os participantes do n8n e faz o diff completo independente de quem disparou o evento.

## Arquivos alterados

- `supabase/functions/webhook-inbound/index.ts` — afrouxar condição (linhas 272-277), adicionar log de diagnóstico
- Redeploy de `webhook-inbound` e `sync-group-members`
- Disparo manual do sync para a campanha Jonathan via `supabase.functions.invoke`

