

## Plano: Sync de Membros via Comparação de Lista do Grupo

### Problema
Eventos de entrada/saída trazem `@lid` ao invés do telefone real. A resolução individual via Z-API falha frequentemente. A solução é buscar a lista completa de participantes do grupo e comparar com o banco.

### Alterações

**1. Nova Edge Function: `supabase/functions/sync-group-members/index.ts`**

- Recebe: `groupJid`, `campaignId`, `instanceId`, `userId`, `trigger` (join/leave), `senderLid` (opcional)
- Busca credenciais da instância (`external_instance_id`, `external_instance_token`)
- Chama Z-API: `GET /group-metadata/{groupJid}` para obter lista completa de participantes com telefones reais
- Busca membros ativos atuais do banco (`group_members` WHERE `group_campaign_id` AND `status = 'active'`)
- Compara: novos = estão na Z-API mas não no banco; saíram = estão no banco mas não na Z-API
- Para novos: upsert em `group_members` com phone real + nome + isAdmin; insert em `group_member_history` (action: join); upsert em `leads`
- Para saídos: update status='left' + left_at; insert em `group_member_history` (action: leave)
- Retorna `{ success, entered, left, total }`

**2. Atualizar `supabase/functions/webhook-inbound/index.ts`**

- Na seção "AUTO-SYNC GROUP MEMBERS" (linhas 272-400): substituir toda a lógica de resolução individual LID→phone por uma chamada à nova function `sync-group-members`
- Quando `group_join` ou `group_leave` é detectado e há campanhas vinculadas:
  - Para cada campanha, invocar `sync-group-members` com os dados necessários
  - Remover o bloco de resolução Z-API individual (linhas 300-328)
  - Remover o loop manual de upsert/update de membros (linhas 330-391)
- Manter o contexto `senderPhone` atualizado para a seção de execution lists abaixo (sync-group-members pode retornar o phone resolvido)

**3. Migration SQL**

- Criar unique index parcial em `group_members(group_campaign_id, lid) WHERE lid IS NOT NULL` para suportar upsert por LID quando phone não disponível como fallback
- O `group_members_campaign_phone_unique` já existe mas permite NULL phone — precisamos garantir que o sync não crie duplicatas

**4. `supabase/config.toml`**

- Adicionar `[functions.sync-group-members]` com `verify_jwt = false`

### Detalhes Técnicos

**Z-API Endpoint**: `GET /group-metadata/{groupJid}` retorna `{ participants: [{ phone, id, name, short, isAdmin, isSuperAdmin }] }`

**Comparação**: Usa `phone` como chave. Membros com phone no banco que não estão na lista da Z-API = saíram. Phones na Z-API que não estão no banco = entraram.

**Fallback**: Se a chamada Z-API falhar, o sync retorna erro e o webhook-inbound faz log mas não bloqueia o fluxo.

**Execution lists**: Após o sync, o webhook-inbound continua acumulando leads normalmente usando o `senderPhone` ou `senderLid` como antes.

### Resultado
- Membros sempre salvos com telefone real (da lista do grupo)
- Detecção de entrada/saída por comparação (não depende do evento @lid)
- Nome e status de admin atualizados automaticamente
- Leads criados com telefone correto

