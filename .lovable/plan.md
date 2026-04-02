
Objetivo

Fazer as variáveis do webhook realmente chegarem resolvidas nos nós de gestão de grupo, especialmente no `group_create`.

Diagnóstico

- O screenshot mostra o payload saindo com `action: "message.send_group_create"` e `groupName` ainda com `{{first_name}}`.
- Isso confirma que o `group_create` não está entrando no fluxo de “group management” em `supabase/functions/execute-message/index.ts`.
- Hoje o código:
  - não mapeia `group_create` para `group.create`
  - não inclui `group_create` em `GROUP_MANAGEMENT_NODE_TYPES`
  - faz replace em campos que a UI nem usa (`participants`, `groupDescription`) e deixa de fora os campos reais (`groupName`, `newName`, `phones`)

Plano de implementação

1. Corrigir o roteamento do nó `group_create`
- Arquivo: `supabase/functions/execute-message/index.ts`
- Adicionar `group_create: "group.create"` em `getActionForNodeType`
- Incluir `group_create` em `GROUP_MANAGEMENT_NODE_TYPES`

2. Corrigir a substituição de variáveis nos campos reais
- No mesmo arquivo, trocar o replace manual por uma função recursiva para percorrer:
  - strings
  - arrays
  - objetos
- Aplicar isso no config dos nós de gestão de grupo para cobrir corretamente:
  - `groupName`
  - `newName`
  - `description`
  - `url`
  - `phone`
  - `phones[]`

3. Adicionar um fallback seguro no gatilho do webhook
- Arquivo: `supabase/functions/trigger-sequence/index.ts`
- Além dos `fieldMappings`, incluir fallback para chaves simples do payload (ex.: `first_name`, `last_name`) em `customFields`
- Manter os `fieldMappings` como prioridade quando existirem

4. Validação
- Disparar o webhook com `first_name` e `last_name`
- Confirmar que o payload/log sai com:
  - `action: "group.create"`
  - `groupName: "Suporte VIP | João Silva"`
  - `phones[]` resolvidos quando houver variáveis
- Confirmar que a sequência continua executando apenas 1 vez

Resultado esperado

- `group_create` deixa de sair como `message.send_group_create`
- Variáveis passam a funcionar em `group_create`, `group_rename`, `group_add_participant` e demais nós de gestão de grupo
- O comportamento fica consistente mesmo quando o webhook manda campos simples no JSON

Detalhes técnicos

- Arquivos afetados:
  - `supabase/functions/execute-message/index.ts`
  - `supabase/functions/trigger-sequence/index.ts`
- Sem mudanças de banco ou UI; é correção na orquestração do backend.
