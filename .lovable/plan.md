

## Fix: checkboxes de campanha não respondem ao clique

### Causa
Linha 222: `disabled={allCampaigns}` — como `allCampaigns` inicia `true`, todos os checkboxes individuais estão **desabilitados**. O `onCheckedChange` nunca dispara, então `toggleCampaign` (que faria `setAllCampaigns(false)`) nunca é chamado. Ciclo impossível.

### Solução
Remover `disabled={allCampaigns}` dos checkboxes individuais. A função `toggleCampaign` já faz `setAllCampaigns(false)` automaticamente ao selecionar uma campanha, e o checkbox "Todas as campanhas" limpa as seleções individuais ao ser marcado. A lógica se autogerencia sem precisar do `disabled`.

### Alteração

**`src/components/call-panel/RemoveFromQueueDialog.tsx` linha 222:**
- Remover: `disabled={allCampaigns}`

