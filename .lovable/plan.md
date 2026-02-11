

# Melhorar Espacamento do Painel de Ligacoes

## Problema

Os elementos dentro da aba "Ligacoes" (cards de metricas, barra de filtros, abas de status e tabela) estao colados sem espacamento vertical, pois estao diretamente dentro do `TabsContent` sem um container com espacamento.

## Solucao

### `src/pages/CallPanel.tsx`

1. **Envolver o conteudo da aba "calls"** em uma `div` com `className="space-y-6"` para adicionar espacamento uniforme de 24px entre cada secao (metricas, filtros, tabs de status, tabela).

2. **Agrupar filtros e abas de status** em um bloco unico com `space-y-3` para que fiquem visualmente conectados (busca + campanha + abas de status), separados das metricas acima e da tabela abaixo.

3. **Adicionar separador visual** entre as metricas e os filtros usando um `<Separator />` ou simplesmente o espacamento adequado do `space-y-6`.

### Detalhes Tecnicos

- Linha ~486: adicionar `<div className="space-y-6">` logo apos o `TabsContent`
- Fechar esse `div` antes do fechamento do `TabsContent`
- Agrupar a barra de filtros (Input + Select) e as abas de status dentro de uma `div` com `space-y-3` para ficarem proximos mas com respiro
- Nenhuma mudanca funcional, apenas ajuste de layout/espacamento
