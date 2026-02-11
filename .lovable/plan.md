
# Corrigir Galeria de Midia no Dispatch (Despacho)

## Problema

O `DispatchSequenceBuilder` nao passa a prop `renderMediaUploader` para o `UnifiedNodeConfigPanel`. Isso faz com que os campos de midia (imagem, video, audio, documento) mostrem apenas um input de texto simples em vez do componente completo com abas Biblioteca/Upload/URL.

No Group (Grupo), o wrapper passa corretamente o `renderMediaUploader` com o `MediaUploader`. No Dispatch (Despacho), essa prop esta ausente.

## Solucao

### `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`

Adicionar a importacao do `MediaUploader` e do `MediaLibraryPicker` (que ja existem em `group-campaigns/sequences/`) e passar a prop `renderMediaUploader` ao `UnifiedNodeConfigPanel`.

Como o `MediaUploader` esta em `src/components/group-campaigns/sequences/MediaUploader.tsx`, ele sera importado diretamente de la (ambos os contextos compartilham o mesmo componente de upload).

Mudancas:
1. Importar `MediaUploader` de `@/components/group-campaigns/sequences/MediaUploader`
2. No `renderConfigPanel`, adicionar a prop `renderMediaUploader` identica a que o SequenceBuilder do Grupo ja usa

### Detalhes Tecnicos

**Arquivo:** `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`

- Linha 8: adicionar import do `MediaUploader`
- Linhas 152-158: adicionar `renderMediaUploader` ao `UnifiedNodeConfigPanel`

```typescript
// Adicionar import
import { MediaUploader } from "@/components/group-campaigns/sequences/MediaUploader";

// No renderConfigPanel, adicionar renderMediaUploader:
renderConfigPanel={(node, onUpdateConfig, onClose) => (
  <UnifiedNodeConfigPanel
    node={node}
    onUpdate={onUpdateConfig}
    onClose={onClose}
    mode="dispatch"
    renderMediaUploader={(props) => (
      <MediaUploader
        mediaType={props.mediaType as "image" | "video" | "audio" | "document" | "sticker"}
        currentUrl={props.currentUrl}
        onUpload={props.onUpload}
        onUrlChange={props.onUrlChange}
        placeholder={props.placeholder}
      />
    )}
  />
)}
```

Tambem e necessario ajustar o `UnifiedNodeConfigPanel` para que no modo "dispatch" ele tambem use o `renderMediaUploader` quando disponivel (atualmente o codigo ja faz isso corretamente na funcao `renderMediaField` -- verifica `isGroup && renderMediaUploader`, mas precisa mudar para apenas `renderMediaUploader` sem checar o modo):

**Arquivo:** `src/components/sequences/UnifiedNodeConfigPanel.tsx`

- Linha 103: mudar de `if (isGroup && renderMediaUploader)` para `if (renderMediaUploader)`, permitindo que ambos os modos usem o MediaUploader quando a prop e fornecida.

Isso garante que qualquer contexto que passe `renderMediaUploader` tera a galeria completa com Biblioteca/Upload/URL.
