
# Plano: Salvar Valores Reais nas Poll Messages

## Problema Identificado

Quando uma enquete é enviada e registrada na tabela `poll_messages`, o sistema está salvando o **template** com variáveis (`{{fileName}}`) ao invés dos **valores reais** já substituídos.

### Causa Raiz

No arquivo `execute-message/index.ts`:

```typescript
// Linha 645-652: Variáveis são substituídas no formattedConfig
const formattedConfig = formatNodeConfig(node.config, node.node_type);
textFields.forEach((field) => {
  if (typeof formattedConfig[field] === "string") {
    formattedConfig[field] = replaceVariables(formattedConfig[field] as string);
  }
});

// Linha 750: Mas ao salvar, usa node.config ORIGINAL (sem substituição)
const pollConfig = node.config as Record<string, unknown>;  // ❌ Errado!
```

O `question_text` e `options` são salvos com os placeholders porque o código está lendo de `node.config` (original) ao invés de `formattedConfig` (com valores substituídos).

---

## Solução

Alterar a linha 750-769 para usar `formattedConfig` em vez de `node.config`:

### Antes (incorreto)
```typescript
if (node.node_type === "poll" && (zaapId || externalMessageId) && !dest.isPrivate) {
  const pollConfig = node.config as Record<string, unknown>;  // ❌ Original
  const pollOptions = (pollConfig.options as string[]) || [];
  // ...
  question_text: (pollConfig.question as string) || (pollConfig.title as string) || "",
  options: pollOptions,
}
```

### Depois (correto)
```typescript
if (node.node_type === "poll" && (zaapId || externalMessageId) && !dest.isPrivate) {
  // Use formattedConfig which has variables already replaced
  const pollQuestion = (formattedConfig.question as string) || (formattedConfig.title as string) || "";
  
  // Also replace variables in options array
  const rawOptions = (formattedConfig.options as string[]) || [];
  const pollOptions = rawOptions.map(opt => replaceVariables(opt));
  
  // option_actions still comes from original config (they don't contain variables)
  const optionActions = (node.config as Record<string, unknown>).optionActions || {};
  
  // ...
  question_text: pollQuestion,  // ✅ Com valor real
  options: pollOptions,         // ✅ Com valores reais
}
```

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/execute-message/index.ts`

Atualizar o bloco de inserção na `poll_messages` (linhas 748-771):

1. Remover a variável `pollConfig` que lê de `node.config`
2. Usar `formattedConfig` para obter `question` e `title`
3. Aplicar `replaceVariables()` em cada opção do array `options`
4. Manter `optionActions` vindo de `node.config` (são configurações, não texto)

---

## Resultado Esperado

### Antes
```json
{
  "poll": {
    "question": "🔔 *NOVO PEDIDO*\n\n- {{fileName}}"
  }
}
```

### Depois
```json
{
  "poll": {
    "question": "🔔 *NOVO PEDIDO*\n\n- Pedido_12345.pdf"
  }
}
```

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/execute-message/index.ts` | Usar `formattedConfig` ao salvar `poll_messages` |
