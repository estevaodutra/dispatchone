

## Corrigir exibição do código de conexão

### Problema

A resposta do webhook vem no formato:
```json
[{ "instance": {...}, "Client-Token": "...", "connection": { "code": "Y7F9JDYN" } }]
```

Mas o código verifica `response?.code` (flat) em dois lugares:

1. **Linha 792**: `if (response?.code)` -- nunca é true porque o code está em `response.connection.code`, então `setConnectionStep("code")` nunca executa
2. **Linha 858**: `webhookResponse?.code` -- mesmo problema, nunca encontra o código

### Solução

Na função `triggerConnectionWebhook`, após normalizar a resposta (linha 243), extrair `connection.code` e mapeá-lo para o campo flat `code` no `webhookResponse`:

```typescript
// Após normalizar, extrair connection.code para o nível raiz
if (normalizedData.connection?.code) {
  normalizedData = { ...normalizedData, code: normalizedData.connection.code };
}
setWebhookResponse(normalizedData);
```

### Arquivo alterado
- `src/pages/Instances.tsx` -- 1 linha adicionada após linha 242

