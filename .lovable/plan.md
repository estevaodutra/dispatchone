

# Adicionar campo "Nome" aos componentes do roteiro

## Objetivo

Permitir que cada componente (no) do roteiro tenha um nome/label personalizado pelo usuario. Esse nome sera exibido na lista do canvas (coluna "Roteiro") em vez do trecho do texto do conteudo.

## Alteracoes

### 1. Modelo de dados (`src/hooks/useCallScript.ts`)

Adicionar campo `label` opcional na interface `CallScriptNode.data`:

```text
data: {
  label?: string;   // <-- novo
  text?: string;
  options?: ScriptOption[];
}
```

Nenhuma migracao de banco necessaria pois `nodes` e armazenado como JSONB -- o campo simplesmente sera `undefined` em nos existentes.

### 2. Painel de configuracao (`src/components/call-campaigns/tabs/ScriptTab.tsx`)

- No painel "Configuracao" (coluna direita), adicionar um campo `Input` com label "Nome" acima do campo de texto/pergunta para todos os tipos de no (exceto start e end).
- Ao editar, chamar `handleUpdateNode(id, { label: value })`.

### 3. Exibicao no canvas

- Na lista de nos (coluna central "Roteiro"), exibir `node.data.label || node.data.text || "(vazio)"` no span truncado.
- No seletor de destino das opcoes de pergunta (QuestionConfig), exibir `node.data.label || snippet do texto` para facilitar a identificacao do no destino.

### 4. Resumo visual

```text
Antes:  [Badge Tipo] [trecho do texto...]
Depois: [Badge Tipo] [nome se houver, senao trecho do texto...]
```

No painel de configuracao:

```text
[Badge Tipo]
Nome:     [ Input para o nome do componente ]
Texto:    [ Textarea para o conteudo ]
```

