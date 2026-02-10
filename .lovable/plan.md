

# Paginacao e Abas de Filtro no Painel de Ligacoes

## O que sera feito

1. **Substituir o filtro de status (dropdown) por abas clicaveis** -- usando o componente `Tabs`/`TabsTrigger` ja existente no projeto, para navegacao mais rapida e visual entre os status: Todas, Agendadas, Em Andamento, Concluidas, Falhas, Canceladas.

2. **Adicionar paginacao de 20 cards por pagina** -- com controles de pagina anterior/proxima e indicador de pagina atual, resetando para pagina 1 ao trocar de aba ou filtro.

## Alteracoes

### Arquivo: `src/pages/CallPanel.tsx`

**Filtro de status como abas:**
- Remover o `Select` de status (linhas 268-278)
- Adicionar um componente `Tabs` com `TabsList` e `TabsTrigger` para cada categoria de status
- Cada aba mostra o label e a contagem (ex: "Agendadas (5)")
- Ao clicar na aba, atualiza o `statusFilter` e reseta a pagina para 1

**Paginacao:**
- Adicionar estados `currentPage` (inicia em 1) e constante `ITEMS_PER_PAGE = 20`
- Calcular `paginatedEntries` com `entries.slice(start, end)`
- Exibir controles de paginacao abaixo dos cards: botoes Anterior/Proximo e indicador "Pagina X de Y"
- Resetar `currentPage` para 1 sempre que `statusFilter`, `campaignFilter` ou `searchQuery` mudar

**Layout dos filtros:**
- Manter o campo de busca e o dropdown de campanha na mesma linha
- As abas de status ficam em uma linha separada abaixo, ocupando toda a largura

## Detalhes tecnicos

- Usar `Tabs` de `@/components/ui/tabs` com `value={statusFilter}` e `onValueChange`
- Valores das abas: `all`, `scheduled`, `in_progress`, `completed`, `failed`, `cancelled`
- Paginacao implementada no frontend (os dados ja sao carregados do hook)
- Usar `useEffect` para resetar `currentPage` quando filtros mudam
- Componentes de paginacao: botoes simples com `ChevronLeft`/`ChevronRight` do lucide-react e texto "X de Y"
