

## Plano: Adicionar botão "Remover todos os leads" na aba Leads da campanha de ligação

### Mudança

**Arquivo:** `src/components/call-campaigns/tabs/LeadsTab.tsx`

1. Adicionar estado `showRemoveAllConfirm` para controlar o AlertDialog de confirmação
2. Adicionar estado `isRemovingAll` para feedback de loading
3. Adicionar botão "Remover Todos" (variante destructive/outline) ao lado do botão "Adicionar Lead", visível quando há leads
4. Adicionar AlertDialog de confirmação com texto claro informando a quantidade de leads que serão removidos
5. Na ação de confirmação, iterar sobre todos os leads e chamar `deleteLead` para cada um (ou fazer delete direto via supabase com `.eq("campaign_id", campaignId)`)

**Arquivo:** `src/hooks/useCallLeads.ts`

6. Adicionar mutation `bulkDeleteAll` que faz `supabase.from("call_leads").delete().eq("campaign_id", campaignId).eq("user_id", userId)` — remove todos os leads da campanha de uma vez, sem precisar iterar
7. Expor `bulkDeleteAll` e `isDeletingAll` no retorno do hook

### UI

- Botão vermelho outline com ícone `Trash2` e texto "Remover Todos" posicionado à esquerda do "Adicionar Lead"
- AlertDialog pedindo confirmação com contagem dos leads (`Tem certeza que deseja remover todos os {stats.total} leads desta campanha?`)
- Durante execução, botão mostra "Removendo..."

