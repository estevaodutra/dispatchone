

## Plano: Corrigir Separação de Phone e LID

### Problema Raiz

O event-classifier (linha 580) extrai o número antes do `@` de `notificationParameters[0]` e salva como `senderPhone`, mesmo quando é um LID. O webhook-inbound tenta resolver o LID via Z-API, mas quando falha, salva o número LID como `phone` na tabela.

### Alterações

**1. `supabase/functions/_shared/event-classifier.ts`**

- Adicionar campo `senderLid: string | null` na interface `EventContext`
- No bloco de extração GROUP_PARTICIPANT (linhas 571-589): se `participantRaw` contém `@lid`, salvar o valor completo em `senderLid` e manter `senderPhone` como `null` (ao invés de extrair o número)
- Se `participantRaw` contém `@s.whatsapp.net`, extrair número normalmente em `senderPhone`

**2. `supabase/functions/webhook-inbound/index.ts`**

- **Pirate section** (linha 234): ajustar condição para aceitar `context.senderPhone || context.senderLid`; enviar LID correto para pirate-process-join
- **Member sync section** (linha 276): ajustar condição para `context.senderPhone || context.senderLid`
  - Quando `senderLid` presente e sem phone resolvido: salvar `phone: null`, `lid: senderLid` no upsert de `group_members`
  - Ajustar `onConflict` para usar `group_campaign_id,lid` quando phone é null
  - Na tentativa de resolução Z-API: se resolver, salvar tanto phone quanto lid
- **Execution lists section** (linha 396): aceitar `senderLid` como identificador quando phone não disponível; salvar phone do lead como LID numeric quando necessário

**3. Migration SQL**

- `ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL` (permitir phone null quando tem LID)
- `ALTER TABLE group_members ALTER COLUMN phone DROP NOT NULL`
- Adicionar check constraint: `phone IS NOT NULL OR lid IS NOT NULL` em ambas tabelas
- Migrar dados existentes: `UPDATE leads SET lid = phone, phone = NULL WHERE phone LIKE '%@lid%'` (e similar para `group_members` com números que são LIDs sem o sufixo `@lid`)
- Criar unique index parcial em `leads(lid, active_campaign_id) WHERE lid IS NOT NULL`

**4. `src/hooks/useLeads.ts`**

- Ajustar busca para funcionar com phone nullable (buscar por `lid` quando phone é null)

**5. `src/hooks/useGroupMembers.ts`**

- Ajustar `onConflict` no upsert para considerar lid quando phone é null

**6. UI: `src/pages/Leads.tsx` e `MembersTab.tsx`**

- Mostrar LID quando phone é null (exibir o identificador disponível)

**7. Deploy** das edge functions atualizadas

### Resultado
- LIDs salvos na coluna `lid`, não em `phone`
- Phone fica null quando só temos LID (sem resolução Z-API)
- Dados existentes corrigidos via migration
- UI mostra o identificador correto

