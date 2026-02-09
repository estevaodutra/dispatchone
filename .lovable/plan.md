
# Renomear "Despacho" para "Disparos"

Atualizar o rotulo "Despacho" para "Disparos" em todos os pontos da interface onde ele aparece como texto visivel ao usuario.

## Arquivos a alterar

1. **`src/components/layout/AppSidebar.tsx`** -- Menu lateral: `title: "Despacho"` para `title: "Disparos"`

2. **`src/pages/campaigns/CampaignsHub.tsx`** -- Card no hub: `title="Despacho"` para `title="Disparos"`

3. **`src/pages/campaigns/DispatchCampaigns.tsx`** -- Breadcrumb e titulo:
   - `type="Despacho"` para `type="Disparos"`
   - `"Campanhas de Despacho"` para `"Campanhas de Disparos"`
   - `"campanha de despacho"` para `"campanha de disparos"` (descricao do dialog)

4. **`src/i18n/locales/pt.ts`** -- Traducao PT: `dispatch: "Despacho"` para `dispatch: "Disparos"`

5. **`src/i18n/locales/es.ts`** -- Traducao ES: `dispatch: "Despacho"` para `dispatch: "Disparos"`

6. **`src/i18n/locales/en.ts`** -- Traducao EN: `dispatch: "Dispatch"` para `dispatch: "Disparos"` (ou manter ingles, dependendo da preferencia)

7. **`src/components/campaigns/NewCampaignDialog.tsx`** -- Dialog de nova campanha: `title: "Despacho"` para `title: "Disparos"`

8. **`src/pages/Campaigns.tsx`** -- Textos descritivos: `"campanhas de despacho"` para `"campanhas de disparos"`

Nenhuma alteracao em rotas, nomes de banco de dados ou logica -- apenas rotulos de exibicao.
