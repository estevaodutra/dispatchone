

# Unificar Logs: Coluna "Destino" e Filtro com Todas as Campanhas

## Resumo

A pagina de Logs atualmente mostra a coluna "Grupo" e o filtro de campanhas so lista campanhas de Grupo. Como os logs agora sao unificados (grupo + dispatch na mesma tabela `group_message_logs`), precisamos ajustar a UI para refletir isso.

## Mudancas

### 1. `src/pages/Logs.tsx` - Renomear coluna e unificar filtro

**Coluna "Grupo" -> "Destino":**
- Linha 208: alterar header de `"Grupo"` para `"Destino"`
- No dialog de detalhes (linha 518): alterar label de `"Grupo"` para `"Destino"`

**Filtro de campanhas - incluir Dispatch:**
- Importar `useDispatchCampaigns` de `@/hooks/useDispatchCampaigns`
- Chamar o hook no componente
- Adicionar as campanhas de dispatch no `SelectContent` do filtro, abaixo das campanhas de grupo

**Busca - ajustar placeholder:**
- Alterar placeholder de "Buscar por campanha, grupo ou tipo..." para "Buscar por campanha, destino ou tipo..."

### Detalhes tecnicos

Alteracoes pontuais no arquivo `src/pages/Logs.tsx`:

1. Adicionar import: `import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";`
2. No componente, adicionar: `const { campaigns: dispatchCampaigns } = useDispatchCampaigns();`
3. No dropdown de filtro (linhas 372-379), adicionar os itens de dispatch apos os de grupo
4. Renomear header da coluna `groupName` de "Grupo" para "Destino" (linha 208)
5. Renomear label no dialog de detalhes de "Grupo" para "Destino" (linha 518)
6. Atualizar placeholder da busca (linha 363)
7. Atualizar headers do CSV export (linha 150): "Grupo" para "Destino"

