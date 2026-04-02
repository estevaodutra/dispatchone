

## Plano: Adicionar tipos de Gestão de Grupo no NewMessageDialog

### Problema
O `NewMessageDialog.tsx` (usado pelo `TimelineSequenceBuilder`) tem uma lista hardcoded de 8 tipos de mensagem (texto, imagem, vídeo, etc.) mas **não inclui os nós de gestão de grupo** (renomear, alterar foto, etc.). Esses nós existem no `SequenceBuilder.tsx` e no `UnifiedNodeConfigPanel.tsx`, mas não aparecem no fluxo de criação do timeline.

### Correção

**Arquivo: `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**

1. Importar ícones faltantes: `Pencil, ImageIcon, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, Smile, MapPin, Contact, Calendar`

2. Adicionar os tipos de gestão de grupo ao array `MESSAGE_TYPES` (ou criar uma seção separada com label de categoria):

```
// Interativo
{ type: "sticker", label: "Figurinha", icon: Smile },
{ type: "location", label: "Localização", icon: MapPin },
{ type: "contact", label: "Contato", icon: Contact },
{ type: "event", label: "Evento", icon: Calendar },

// Gestão de Grupo
{ type: "group_rename", label: "Renomear Grupo", icon: Pencil },
{ type: "group_photo", label: "Alterar Foto", icon: ImageIcon },
{ type: "group_description", label: "Alterar Descrição", icon: FileText },
{ type: "group_add_participant", label: "Adicionar Participante", icon: UserPlus },
{ type: "group_remove_participant", label: "Remover Participante", icon: UserMinus },
{ type: "group_promote_admin", label: "Promover Admin", icon: ShieldPlus },
{ type: "group_remove_admin", label: "Remover Admin", icon: ShieldMinus },
{ type: "group_settings", label: "Configurações", icon: Settings },
```

3. Organizar o step 1 do dialog em **seções visuais** com labels de categoria (Mensagens, Mídia, Interativo, Gestão de Grupo) para facilitar a navegação entre os ~20 tipos

4. Também adicionar os tipos faltantes ao `getDefaultConfig` do `TimelineSequenceBuilder.tsx` se necessário (sticker, location, contact, event já estão lá)

### Resultado
1 arquivo principal modificado (`NewMessageDialog.tsx`), ajustes cosméticos no layout do grid de seleção.

