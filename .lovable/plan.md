

## Plano: Resolver vínculo Lead ↔ Membro e busca por LID

### Diagnóstico
Confirmado via DB:
- O "telefone" `196748727320770` mostrado no histórico 24h é na verdade um **LID** (15+ dígitos, sem código de país), não telefone real
- `group_execution_leads.phone` recebe o LID quando o evento `group_join` chega antes da resolução phone↔LID
- `group_members` tem ambos: `phone` real (`556192113800`) + `lid` (`128853498429553@lid`)
- Por isso a busca na aba Membros não encontra: você pesquisou um LID na coluna `phone`

### Soluções

**1. Webhook-inbound — separar phone real de LID**
Em `supabase/functions/webhook-inbound/index.ts`, quando inserir em `group_execution_leads`:
- Se `senderPhone` for um LID (heurística: >14 dígitos, sem `55`/código país, ou flag do classifier), gravar em `lid` e deixar `phone` nulo
- Tentar resolver phone real consultando `group_members` por `lid` antes de inserir; se encontrar, preencher ambos
- Para linhas antigas: migration de backfill que cruza `group_execution_leads.phone` com `group_members.lid` (movendo valor de `phone` → `lid` e preenchendo phone real quando match)

**2. ExecutionListTab — busca e exibição inteligentes**
Em `src/components/group-campaigns/tabs/ExecutionListTab.tsx`:
- No `LeadEventDialog`, resolver membro por **LID primeiro** (mais preciso), depois telefone
- Mostrar claramente "Identificador: LID" vs "Telefone" no detalhe do lead
- Botão "Ver na lista de Membros" que copia o **telefone real do membro vinculado** (não o LID) para que a busca na aba Membros funcione

**3. MembersTab — busca por LID**
Em `src/components/group-campaigns/tabs/MembersTab.tsx`:
- Estender o filtro de busca para também procurar em `member.lid` (não só `phone`/`name`)
- Normalização: aceitar tanto `128853498429553` quanto `128853498429553@lid`

### Comportamento final
- Histórico 24h continua mostrando o identificador disponível, mas com label correto (LID vs telefone)
- Modal de detalhe vincula corretamente ao membro via LID e oferece o telefone real para busca cruzada
- Aba Membros encontra a pessoa tanto por telefone quanto por LID
- Linhas antigas em `group_execution_leads` são corrigidas via backfill (migration)

