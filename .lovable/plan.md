

## Plano: Sempre exibir filtro de tags no CreateQueueDialog

### Problema

O filtro de tags (linha 539) só aparece quando `availableTags.length > 0`. Se os leads da campanha não têm tags em `custom_fields.tags`, a seção fica invisível. O usuário quer que a opção esteja sempre disponível.

### Alterações

**`src/components/call-panel/CreateQueueDialog.tsx`**:

1. **Remover a condição `availableTags.length > 0`** (linha 539) — sempre exibir a seção de tags
2. **Buscar tags também da tabela `leads`** — no `loadCampaignMeta`, além de extrair tags de `custom_fields.tags` dos `call_leads`, também buscar tags dos leads vinculados (via `lead_id` → `leads.tags`) para cobrir o caso onde as tags estão na tabela principal
3. **Mostrar estado vazio** — quando não há tags, exibir "Nenhuma tag disponível nesta campanha" dentro da seção
4. **Permitir input manual de tag** — adicionar um input para digitar uma tag manualmente caso não existam tags pré-definidas, como fallback

