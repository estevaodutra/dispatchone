

# Sincronizar membros de grupo como leads na pagina /leads

## Resumo

Atualmente, quando membros sao importados de grupos via webhook, eles sao salvos apenas na tabela `group_members`. O usuario quer que esses membros tambem aparecam na pagina `/leads`, ou seja, precisam ser criados como registros na tabela `leads`.

## Solucao

Modificar o hook `useGroupMembers` para que, alem de inserir na tabela `group_members`, tambem crie (ou atualize) registros na tabela `leads` com os mesmos dados de telefone/nome. Isso sera feito no `addMembersBulk` e no `addMember`.

## Arquivos modificados

### 1. `src/hooks/useGroupMembers.ts`

**Na mutacao `addMembersBulkMutation`** (apos inserir em `group_members`):
- Para cada membro inserido, fazer um upsert na tabela `leads` usando o telefone como chave (ja existe constraint de unicidade `phone + user_id`)
- Usar `supabase.from("leads").upsert(...)` com `onConflict: "phone,user_id"` para evitar duplicatas
- Atribuir `active_campaign_id = groupCampaignId` e `active_campaign_type = "grupos"` para vincular o lead a campanha
- Adicionar tag automatica "grupo" para identificar a origem

**Na mutacao `addMemberMutation`** (membro individual):
- Mesma logica: apos inserir em `group_members`, fazer upsert em `leads`

**Invalidar queries de leads** apos sucesso:
- Adicionar `queryClient.invalidateQueries({ queryKey: ["leads"] })` e `queryClient.invalidateQueries({ queryKey: ["leads-stats"] })`

### Detalhes tecnicos

Codigo do upsert em leads (dentro de addMembersBulk):

```text
const leadRecords = members.map((m) => ({
  user_id: user.id,
  phone: m.phone,
  name: m.name || null,
  tags: ["grupo"],
  active_campaign_id: groupCampaignId,
  active_campaign_type: "grupos",
  status: "active",
}));

await supabase
  .from("leads")
  .upsert(leadRecords, { onConflict: "phone,user_id", ignoreDuplicates: false });
```

Isso garante que:
- Novos membros criam leads automaticamente
- Membros que ja existem como leads sao atualizados com a campanha atual
- A pagina /leads mostra todos os contatos da plataforma, incluindo os importados de grupos

