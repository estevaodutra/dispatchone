
# Adicionar Acao nas Opcoes de Resposta do Roteiro

## O que sera feito

Cada opcao de resposta em nos de "Pergunta" do roteiro de ligacao passara a ter um campo opcional para executar uma acao pos-ligacao (das acoes configuradas na aba "Acoes" da campanha). Isso permite que, ao selecionar uma resposta durante a ligacao, uma acao automatica seja disparada (ex: iniciar sequencia, adicionar tag, webhook, etc).

## Mudancas

### 1. `src/hooks/useCallScript.ts` — Atualizar interface

Adicionar o campo `actionId` na interface `ScriptOption`:

```typescript
export interface ScriptOption {
  text: string;
  targetNodeId?: string;
  actionId?: string;  // ID da acao a executar (de call_script_actions)
}
```

### 2. `src/components/call-campaigns/tabs/ScriptTab.tsx` — UI de configuracao

No componente `QuestionConfig`, para cada opcao de resposta, adicionar um segundo `Select` abaixo do seletor de destino (direcionamento), permitindo escolher uma acao:

- Importar `useCallActions` para carregar as acoes disponiveis da campanha
- Receber `campaignId` como prop no `QuestionConfig`
- Adicionar um `Select` com:
  - Valor padrao: "Nenhuma acao"
  - Opcoes: lista de acoes da campanha (nome + cor como indicador visual)
  - Ao selecionar, gravar o `actionId` na opcao

Layout de cada opcao ficara:
1. Input de texto + botao de remover (ja existe)
2. Select de direcionamento "Proximo (padrao)" (ja existe)
3. **Novo**: Select de acao "Nenhuma acao" / lista de acoes configuradas

### 3. `src/components/call-campaigns/operator/InlineScriptRunner.tsx` — Execucao

Ao registrar a resposta escolhida durante a ligacao, verificar se a opcao selecionada possui `actionId`. Se sim, pre-selecionar essa acao automaticamente na aba de registro, facilitando a execucao do follow-up.

## Detalhes Tecnicos

- O `ScriptOption.actionId` referencia o `id` de um registro na tabela `call_script_actions`
- Nenhuma alteracao de banco de dados e necessaria pois o campo `nodes` do `call_scripts` e JSONB e ja suporta campos adicionais
- O `useCallActions(campaignId)` ja fornece a lista de acoes disponiveis com nome, cor e icone
- A prop `campaignId` sera passada do `ScriptTab` para o `QuestionConfig`
