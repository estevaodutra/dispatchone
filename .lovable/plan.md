

## Plano: Adicionar nós de Status (Imagem e Vídeo) nas sequências

### Objetivo
Adicionar dois novos tipos de nó — `status_image` e `status_video` — para postar status/stories no WhatsApp diretamente das sequências de campanha.

### Alterações

**1. NewMessageDialog.tsx** — Nova categoria "Status" no seletor de nós
- Adicionar categoria `{ label: "Status", items: [...] }` com `status_image` (ícone ImageIcon) e `status_video` (ícone Video)
- Importar ícone `CircleDot` ou reutilizar existentes

**2. UnifiedNodeConfigPanel.tsx** — Config panel para os novos nós
- Adicionar em `NODE_TITLES`: `status_image: "Status Imagem"` e `status_video: "Status Vídeo"`
- Adicionar em `SENDABLE_NODE_TYPES` os dois tipos
- Adicionar seções de config: upload de mídia + legenda (caption) — similar a image/video mas sem `sendPrivate`/`viewOnce`

**3. TimelineSequenceBuilder.tsx** — Default configs
- Adicionar no `getDefaultConfig`:
  - `status_image`: `{ url: "", caption: "" }`
  - `status_video`: `{ url: "", caption: "" }`

**4. SequenceBuilder.tsx** — NODE_CATEGORIES + default configs
- Adicionar os dois nós na categoria existente ou nova categoria "Status"
- Adicionar no `getDefaultConfig` local

**5. supabase/functions/execute-message/index.ts** — Backend
- Adicionar em `getActionForNodeType`: `status_image: "status.send_image"` e `status_video: "status.send_video"`
- Estes nós NÃO são group management, seguem o fluxo normal de mensagens

**6. supabase/functions/process-scheduled-messages/index.ts** — Scheduled
- Adicionar o mesmo mapeamento em `getActionForNodeType`

### Resultado
Dois novos nós disponíveis no builder de sequências para postar imagem e vídeo no status do WhatsApp, com upload de mídia e legenda opcional.

6 arquivos, ~40 linhas adicionadas.

