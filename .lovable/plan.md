

## Plano: Monitoramento em Tempo Real e Correção do Gatilho de Entrada

### Problemas Identificados

1. **Sem atualização em tempo real**: As tabelas `group_members`, `group_member_history` e `group_execution_leads` não têm Realtime habilitado, então mudanças no backend não aparecem na interface sem refresh manual.

2. **webhook-inbound não atualiza membros**: Quando um evento `group_join` ou `group_leave` chega, o `webhook-inbound` processa Campanhas Pirata e Listas de Execução, mas **não insere/atualiza** na tabela `group_members` nem registra na `group_member_history`. Ou seja, a aba Membros nunca reflete entradas/saídas automaticamente.

3. **Listas de Execução com gatilho de entrada**: O acúmulo de leads funciona (insere em `group_execution_leads`), mas sem realtime a UI não atualiza. Além disso, se a janela expirou ou o `campaign_groups` não vincula o grupo, leads não são capturados.

### Alterações

**Migration SQL (nova)**
- Habilitar Realtime nas tabelas `group_members`, `group_member_history` e `group_execution_leads`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_member_history;
ALTER PUBLICATION supabase_realtime ADD TABLE group_execution_leads;
```

**`supabase/functions/webhook-inbound/index.ts`**
- No bloco de processamento de `group_join` (após o pirate-process-join), adicionar lógica para:
  1. Buscar `campaign_groups` pelo `chatJid` para encontrar o `campaign_id`
  2. Se encontrado, fazer `upsert` em `group_members` (phone, status=active, joined_at=now)
  3. Inserir registro em `group_member_history` (action=join)
- Adicionar bloco equivalente para `group_leave`:
  1. Buscar campaign via `campaign_groups`
  2. Atualizar `group_members` (status=left, left_at=now)
  3. Inserir registro em `group_member_history` (action=leave)

**`src/hooks/useGroupMembers.ts`**
- Adicionar subscription Realtime na tabela `group_members` filtrado por `group_campaign_id`, invalidando a query key ao receber mudanças

**`src/hooks/useMemberMovement.ts`**
- Adicionar subscription Realtime na tabela `group_member_history` filtrado por `group_campaign_id`, invalidando `member_movement` ao receber mudanças

**`src/hooks/useGroupExecutionList.ts`**
- Adicionar subscription Realtime na tabela `group_execution_leads`, invalidando a query de leads do ciclo ao receber mudanças

### Resultado
- Membros aparecem/desaparecem automaticamente na aba Membros quando entram/saem do grupo
- Contadores de Analytics (movimento) atualizam em tempo real
- Leads das Listas de Execução aparecem na UI assim que são capturados
- O gatilho `group_join` nas listas de execução já funciona (o webhook-inbound já acumula leads), agora a UI reflete isso

