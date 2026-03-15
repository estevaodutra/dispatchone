

## Habilitar botão "Pirata" e remover "Em breve"

Três locais precisam ser atualizados:

1. **`src/components/layout/AppSidebar.tsx` (linha 86)** -- remover `comingSoon: true` do item Pirata no sidebar
2. **`src/pages/campaigns/CampaignsHub.tsx` (linha 84)** -- remover prop `comingSoon` do CampaignTypeCard Pirata
3. **`src/components/campaigns/NewCampaignDialog.tsx` (linha 53)** -- mudar `enabled: false` para `enabled: true`

Edições simples de 1 linha em cada arquivo.

