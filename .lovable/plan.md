

## Plano: Corrigir contagem na notificacao de importacao

### Problema
O toast mostra "679 membro(s) importado(s)" (soma bruta dos 2 grupos antes de deduplicar), mas o banco tem 706 membros unicos. O `totalImported` soma `membersToInsert.length` de cada grupo, sem considerar que o upsert pode atualizar registros existentes em vez de insertar novos.

### Solucao
Alterar `addMembersBulk` no hook `useGroupMembers.ts` para retornar a contagem real de registros inseridos/atualizados pelo Supabase, e usar esse valor no toast em vez da contagem pre-upsert.

**Alternativa mais simples**: deduplicar os membros no proprio `handleFetchMembers` antes de enviar ao bulk — acumular todos os membros dos grupos num Map por phone, e so depois chamar `addMembersBulk` uma vez. O toast mostrara a contagem de telefones unicos.

### Alteracoes

**`src/components/group-campaigns/tabs/MembersTab.tsx`**
- Acumular membros de todos os grupos num `Map<string, member>` (chave = phone) dentro do loop
- Apos o loop, chamar `addMembersBulk` uma unica vez com os valores do Map
- Mostrar no toast `uniqueMembers.size` em vez de `totalImported`

Nenhum outro arquivo precisa ser alterado.

