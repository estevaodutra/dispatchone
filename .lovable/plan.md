

## Plano: Aplicar substituição de variáveis nos nós de gestão de grupo

### Problema
O `execute-message` não aplica `replaceVariables()` nos campos dos nós de gestão de grupo (`group_create`, `group_rename`, `group_description`, etc.). Os campos como `groupName`, `groupDescription`, `participants` passam direto sem substituição de `{{variavel}}`.

### Causa
Na linha 674, o `formattedConfig` é criado mas nunca passa por `replaceVariables()`. Diferente dos nós de mensagem (linha 752-757) que fazem substituição em campos como `text`, `caption`, etc.

### Alteração

**Arquivo: `supabase/functions/execute-message/index.ts`**

Após a linha 674 (`const formattedConfig = formatNodeConfig(...)`) no bloco de GROUP MANAGEMENT NODES, adicionar substituição de variáveis em todos os campos de texto do config:

```typescript
// Replace variables in group management config fields
const groupMgmtTextFields = [
  "groupName", "groupDescription", "groupSubject",
  "participants", "phone", "name", "text", "message",
  "description", "title", "content"
];
groupMgmtTextFields.forEach((field) => {
  if (typeof formattedConfig[field] === "string") {
    formattedConfig[field] = replaceVariables(formattedConfig[field] as string);
  }
});

// Also handle arrays (e.g., participants list)
if (Array.isArray(formattedConfig.participants)) {
  formattedConfig.participants = formattedConfig.participants.map(
    (p: unknown) => typeof p === "string" ? replaceVariables(p) : p
  );
}
```

### Resultado
Variáveis como `{{first_name}}` e `{{last_name}}` mapeadas via webhook serão corretamente substituídas no `groupName` e em qualquer outro campo dos nós de gestão de grupo.

1 arquivo, ~15 linhas adicionadas.

