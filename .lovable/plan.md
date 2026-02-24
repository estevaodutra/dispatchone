

# Plan: Atualizar ActionDialog no CallPanel.tsx

## Problema Identificado

O `CallActionDialog.tsx` unificado foi criado e esta conectado ao `CallPopup.tsx` (popup flutuante do operador). Porem, a pagina `/painel-ligacoes` (`CallPanel.tsx`) tem seu proprio componente `ActionDialog` interno (linha 1190) que ainda usa o layout antigo com 3 abas (Roteiro, Acao, Historico).

O usuario esta na pagina `/painel-ligacoes` e ve o dialog antigo.

## Solucao

Atualizar o `ActionDialog` interno do `CallPanel.tsx` (linhas 1188-1346) para usar o mesmo layout unificado do `CallActionDialog`:

### Mudancas no ActionDialog do CallPanel.tsx:

1. **Header destacado** — Nome do lead grande/uppercase, telefone em azul mono, badges (campanha, tentativa), timer
2. **2 abas** em vez de 3 — "Ligacao" (roteiro + acoes juntos) e "Historico"
3. **Secao "Resultado"** com pergunta "O lead atendeu?" + botoes Atendeu/Nao Atendeu + acoes dinamicas da campanha
4. **Manter** a funcionalidade existente de audio player, reagendamento, e selecao de acao

### Arquivo alterado:
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/CallPanel.tsx` | Reescrever o componente `ActionDialog` (linhas 1188-1346) com o novo layout de 2 abas e header destacado |

### Detalhes:
- O header tera o avatar, nome em uppercase, telefone em mono azul, badges de campanha/tentativa, e player de audio (se houver)
- Aba "Ligacao": `InlineScriptRunner` colapsavel + separador + secao de resultado com Atendeu/Nao Atendeu + grid de acoes + notes + botoes salvar/cancelar
- Aba "Historico": mesmo `LeadCallHistory` existente
- A logica de `onSelect` e `onReschedule` permanece inalterada

