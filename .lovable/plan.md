
# Adicionar acao de direcionamento nas opcoes de resposta

## Resumo

Cada opcao de resposta em um no de tipo "Pergunta" tera um seletor (dropdown) ao lado permitindo escolher para qual no do roteiro o fluxo deve ir quando aquela opcao for selecionada. Isso transforma o roteiro linear em um fluxo ramificado.

## Alteracoes

### 1. Atualizar o modelo de dados (`src/hooks/useCallScript.ts`)

Alterar a interface `CallScriptNode` para que `options` deixe de ser `string[]` e passe a ser um array de objetos:

```text
options?: string[]
=>
options?: { text: string; targetNodeId?: string }[]
```

Isso permite armazenar o texto da opcao e o id do no de destino.

### 2. Atualizar o painel de configuracao (`src/components/call-campaigns/tabs/ScriptTab.tsx`)

- Adicionar import do componente `Select` do shadcn.
- Para cada opcao de resposta, alem do campo de texto e botao de excluir, adicionar um `Select` listando todos os outros nos do roteiro (exceto o proprio no de pergunta). Exibir o label do tipo + trecho do texto de cada no.
- Adaptar `handleUpdateNode` para lidar com o novo formato de objetos.
- Adaptar a geracao de edges no `handleSave` para criar edges a partir dos `targetNodeId` das opcoes de pergunta, em vez de apenas seguir a ordem linear.

### 3. Compatibilidade retroativa

- Ao carregar opcoes no formato antigo (`string[]`), converter automaticamente para o novo formato (`{ text: string }[]`) para nao quebrar roteiros existentes.

## Detalhes tecnicos

### Novo formato de opcao

```typescript
interface ScriptOption {
  text: string;
  targetNodeId?: string; // id do no destino, undefined = proximo na ordem
}
```

### Geracao de edges ao salvar

- Para nos que **nao** sao pergunta: edge para o proximo na ordem (como hoje).
- Para nos de pergunta: uma edge por opcao que tenha `targetNodeId` definido, com `label` = texto da opcao. Se nenhum targetNodeId for definido, cai no proximo da ordem (fallback).

### UI do seletor

Cada opcao de resposta tera:

```text
[ Input texto da opcao ] [ Select: direcionar para... ] [ Trash ]
```

O Select mostrara:
- "Proximo (padrao)" como primeira opcao
- Lista dos demais nos com badge de tipo e trecho do texto
