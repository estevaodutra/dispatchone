

## Plano: Corrigir seleção de mídia da biblioteca

### Problema
Em `UnifiedNodeConfigPanel.tsx`, o callback `onUpload` dentro de `renderMediaField` chama `updateConfig` duas vezes consecutivas. Cada chamada faz spread de `node.config` (que é stale/não atualizado entre as duas chamadas), então a segunda chamada (`filename`) sobrescreve a primeira (`url`), resultando na URL nunca ser aplicada.

### Correção

**Arquivo:** `src/components/sequences/UnifiedNodeConfigPanel.tsx`

Substituir as duas chamadas separadas por uma única chamada a `onUpdate` com ambas as chaves:

```typescript
// Antes (bugado):
onUpload: (url, filename) => {
  updateConfig("url", url);
  if (filename) updateConfig("filename", filename);
},

// Depois (corrigido):
onUpload: (url, filename) => {
  const updates: Record<string, unknown> = { ...node.config, url };
  if (filename) updates.filename = filename;
  onUpdate(updates);
},
```

Apenas 1 arquivo, ~3 linhas alteradas.

