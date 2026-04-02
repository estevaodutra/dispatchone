

## Plano: Criar componentes de Gestão de Grupo WhatsApp + Edge Function zapi-proxy

### Resumo

Criar 10 componentes modais reutilizáveis para ações administrativas de grupos WhatsApp via Z-API, organizados em `src/components/whatsapp/group-management/`. Criar também a Edge Function `zapi-proxy` que faz proxy autenticado das chamadas à Z-API usando as credenciais da instância armazenadas no banco.

---

### 1. Edge Function `zapi-proxy`

**Arquivo:** `supabase/functions/zapi-proxy/index.ts`

Recebe `instanceId`, `endpoint`, `method` e `body` do frontend. Busca `external_instance_id` e `external_instance_token` da tabela `instances` usando service role. Monta a URL Z-API (`https://api.z-api.io/instances/{id}/token/{token}{endpoint}`) e faz o proxy da requisição. Retorna o resultado ao frontend.

- Autenticação via JWT (valida claims)
- Verifica que a instância pertence ao usuário autenticado (via RLS ou company membership)
- CORS headers padrão

---

### 2. Storage bucket `group-photos`

**Migração SQL:** Criar bucket público `group-photos` + RLS policy para upload por usuários autenticados.

---

### 3. Componentes (10 arquivos + index.ts)

**Pasta:** `src/components/whatsapp/group-management/`

Todos seguem o padrão descrito pelo usuário: Dialog shadcn/ui → formulário → `supabase.functions.invoke('zapi-proxy', { body: { instanceId, endpoint, method, body } })` → toast sucesso/erro → `onSuccess?.()`.

| Componente | Endpoint Z-API | Particularidades |
|---|---|---|
| `GroupCreateModal` | `POST /create-group` | Sem `groupId` prop; lista de phones com add/remove |
| `GroupUpdateNameModal` | `POST /update-group-name` | Pre-popula `currentName` |
| `GroupUpdatePhotoModal` | `POST /update-group-photo` | Upload para storage → URL pública → Z-API |
| `GroupUpdateDescriptionModal` | `POST /update-group-description` | Textarea 500 chars com contador |
| `GroupAddParticipantModal` | `POST /add-participant` | Lista de phones com add/remove |
| `GroupRemoveParticipantModal` | `POST /remove-participant` | Select se `participants` prop, input livre senão |
| `GroupPromoteAdminModal` | `POST /add-admin` | Mesmo padrão select/input |
| `GroupRemoveAdminModal` | `POST /remove-admin` | Mesmo padrão select/input |
| `GroupSettingsModal` | `POST /update-group-settings` | 4 Switch toggles |
| `GroupInviteLinkModal` | `GET /group-invitation-link/{groupId}` | Auto-fetch ao abrir, skeleton, copiar/abrir link |

**Arquivo:** `index.ts` — re-exporta todos os 10 componentes.

---

### Ordem de implementação

1. Migração SQL: criar bucket `group-photos`
2. Criar Edge Function `zapi-proxy`
3. Criar os 10 componentes modais na ordem listada
4. Criar `index.ts` de exportação

### Arquivos criados
- `supabase/functions/zapi-proxy/index.ts`
- `src/components/whatsapp/group-management/GroupCreateModal.tsx`
- `src/components/whatsapp/group-management/GroupUpdateNameModal.tsx`
- `src/components/whatsapp/group-management/GroupUpdatePhotoModal.tsx`
- `src/components/whatsapp/group-management/GroupUpdateDescriptionModal.tsx`
- `src/components/whatsapp/group-management/GroupAddParticipantModal.tsx`
- `src/components/whatsapp/group-management/GroupRemoveParticipantModal.tsx`
- `src/components/whatsapp/group-management/GroupPromoteAdminModal.tsx`
- `src/components/whatsapp/group-management/GroupRemoveAdminModal.tsx`
- `src/components/whatsapp/group-management/GroupSettingsModal.tsx`
- `src/components/whatsapp/group-management/GroupInviteLinkModal.tsx`
- `src/components/whatsapp/group-management/index.ts`

### Migração SQL
- Criar bucket `group-photos` (público) + RLS para upload autenticado

