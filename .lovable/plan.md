

## Plano: Atribuir Membros a Campanhas de Ligação ou Despacho

### Resumo
Adicionar um botão "Atribuir a Campanha" na aba Membros que abre um dialog para selecionar uma campanha de ligação ou despacho e inserir os membros ativos (filtrados) como leads nessa campanha.

### Alterações

**`src/components/group-campaigns/tabs/MembersTab.tsx`**
- Importar `useCallCampaigns`, `useDispatchCampaigns` e o `AddToCampaignDialog` existente (de `src/components/leads/`)
- Adicionar estado `showAssignDialog` e botão "Atribuir a Campanha" (ícone `UserPlus`) na barra de ações
- Implementar `handleAssignToCampaign(campaignId, campaignType, skipExisting)`:
  - Para `ligacao`: upsert dos membros filtrados (ativos) em `call_leads` com `onConflict: "phone,campaign_id"`
  - Para `despacho`: primeiro garantir que existam em `leads` (upsert por phone), depois inserir em `dispatch_campaign_contacts` com `onConflict: "campaign_id,lead_id"`
- Montar a lista de campanhas disponíveis combinando `callCampaigns` (type=ligacao) e `dispatchCampaigns` (type=despacho) no formato `CampaignItem[]`
- Renderizar `<AddToCampaignDialog>` reutilizando o componente existente

### Fluxo do Usuário
1. Clica "Atribuir a Campanha" na aba Membros
2. Escolhe tipo (Ligação ou Despacho)
3. Seleciona a campanha destino
4. Opção de pular membros já existentes na campanha
5. Confirma — membros ativos são inseridos como leads na campanha selecionada

Nenhuma alteração no banco de dados necessária — reutiliza tabelas e componentes existentes.

