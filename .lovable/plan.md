

## Plano: Adicionar agendamento aos nós de gestão de grupo

### Problema
Os nós de gestão de grupo (`group_rename`, `group_photo`, `group_description`, `group_add_participant`, `group_remove_participant`, `group_promote_admin`, `group_remove_admin`, `group_settings`, `group_create`) não aparecem na seção de agendamento porque não estão incluídos no array `SENDABLE_NODE_TYPES`.

### Alteração

**`src/components/sequences/UnifiedNodeConfigPanel.tsx`** — linha 92:

Adicionar todos os tipos de gestão de grupo ao array `SENDABLE_NODE_TYPES`:

```typescript
const SENDABLE_NODE_TYPES = [
  "message", "image", "video", "audio", "document", "sticker", 
  "buttons", "list", "poll", "location", "contact", "event", 
  "status_image", "status_video",
  "group_create", "group_rename", "group_photo", "group_description",
  "group_add_participant", "group_remove_participant", 
  "group_promote_admin", "group_remove_admin", "group_settings"
];
```

### Arquivos
- `src/components/sequences/UnifiedNodeConfigPanel.tsx`

