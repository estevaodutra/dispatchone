
# Plano: Habilitar Campanhas de Ligacao

Remover a marcacao "Em breve" da opcao de Campanhas de Ligacao em todos os locais da interface.

---

## Arquivos a Modificar

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/components/layout/AppSidebar.tsx` | 72 | Remover `comingSoon: true` do item "Ligacao" |
| `src/pages/campaigns/CampaignsHub.tsx` | 112 | Remover prop `comingSoon` do card "Ligacao" |
| `src/components/campaigns/NewCampaignDialog.tsx` | 73 | Mudar `enabled: false` para `enabled: true` |

---

## Resultado

- Menu lateral: "Ligacao" aparecera sem opacidade reduzida e sem label "Em breve"
- Hub de campanhas: Card "Ligacao" sera clicavel e navegara para a pagina
- Dialog nova campanha: Opcao "Ligacao" estara habilitada para selecao
