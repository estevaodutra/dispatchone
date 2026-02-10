
# Corrigir dropdown "Campanha" na aba Acoes das Campanhas de Ligacao

## Problema

O dropdown "Campanha de Grupo" na aba Acoes (`ActionsTab.tsx`) das Campanhas de Ligacao so lista campanhas de grupo (`useGroupCampaigns`). Ele deveria tambem listar campanhas de disparos (`useDispatchCampaigns`), com segmentacao visual entre os dois tipos.

## Solucao

Modificar o componente `ActionsTab.tsx` para:

1. Importar `useDispatchCampaigns` alem de `useGroupCampaigns`
2. Importar `useDispatchSequences` alem de `useSequences`
3. Renomear o label do dropdown de "Campanha de Grupo" para "Campanha"
4. Exibir os itens no dropdown agrupados com `SelectGroup` e `SelectLabel`:
   - **Campanhas de Grupo** - lista as campanhas de grupo
   - **Campanhas de Disparos** - lista as campanhas de dispatch
5. Guardar no `actionConfig` o tipo da campanha selecionada (`campaignType: "group" | "dispatch"`) para saber qual hook de sequencias usar
6. Carregar sequencias do hook correto conforme o tipo selecionado:
   - Se `campaignType === "group"` -> usar `useSequences(campaignId)`
   - Se `campaignType === "dispatch"` -> usar `useDispatchSequences(campaignId)`

## Arquivo modificado

`src/components/call-campaigns/tabs/ActionsTab.tsx`

## Detalhes tecnicos

- Adicionar imports: `useDispatchCampaigns`, `useDispatchSequences`, `SelectGroup`, `SelectLabel`
- Chamar ambos os hooks no componente: `useGroupCampaigns()` e `useDispatchCampaigns()`
- Chamar ambos os hooks de sequencias: `useSequences(groupCampaignId)` e `useDispatchSequences(dispatchCampaignId)`
- Determinar qual campaignId passar para cada hook com base no `campaignType` armazenado em `actionConfig`
- No dropdown, usar `SelectGroup` com `SelectLabel` para separar visualmente os dois grupos
- Ao selecionar uma campanha, gravar tanto o `campaignId` quanto o `campaignType` no `actionConfig`, e limpar o `sequenceId`
- No dropdown de sequencias, exibir as sequencias do hook correto conforme o tipo
