

## Plano: Corrigir contagem duplicada de membros

### Problema
Quando o botão "Listar Membros" é clicado, os membros de cada grupo vinculado são inseridos na tabela `group_members` sem verificar se o telefone já existe naquela campanha. Membros que estão em ambos os grupos são inseridos múltiplas vezes. Na campanha em questão: 803 registros, mas apenas 706 telefones únicos.

### Causa raiz
O `addMembersBulk` no hook `useGroupMembers.ts` usa `.insert()` simples, sem `onConflict`. Como não há constraint de unicidade `(group_campaign_id, phone)`, duplicatas são criadas livremente.

### Alterações

**1. Migration SQL**
- Remover registros duplicados (manter o mais antigo por phone+campaign)
- Criar constraint UNIQUE em `(group_campaign_id, phone)`

**2. `src/hooks/useGroupMembers.ts`**
- Alterar `addMembersBulk` para usar `.upsert()` com `onConflict: 'group_campaign_id,phone'` em vez de `.insert()`
- Alterar `addMemberMutation` para usar `.upsert()` com o mesmo onConflict
- Adicionar `group_campaign_id` ao registro inserido no upsert

**3. `src/components/group-campaigns/tabs/MembersTab.tsx`**
- Nenhuma alteração necessária (a contagem `stats.total` já vem de `members.length`, que será correta após remover duplicatas)

### Resultado
- Contagem correta: ~706 membros (em vez de 803)
- Futuras sincronizações não criarão duplicatas

### Arquivos
- Migration SQL (cleanup + constraint)
- `src/hooks/useGroupMembers.ts`

