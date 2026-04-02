

## Plano: Adicionar ações de Gestão de Grupo na aba "Grupos Vinculados"

### Problema
Os componentes de gestão de grupo (`GroupUpdateNameModal`, `GroupSettingsModal`, etc.) foram criados mas não estão sendo usados em nenhuma tela.

### Alteração

**Arquivo: `src/components/group-campaigns/tabs/GroupsListTab.tsx`**

Na seção "Grupos Vinculados", para cada grupo vinculado que tem `instanceId`, adicionar um `DropdownMenu` com as ações de gestão disponíveis:

1. **Importar** os componentes de `@/components/whatsapp/group-management`
2. **Substituir** o botão de delete solitário por um `DropdownMenu` (ícone `MoreVertical`) com as seguintes ações:
   - **Renomear** → abre `GroupUpdateNameModal` (instanceId + groupJid + currentName)
   - **Atualizar Foto** → abre `GroupUpdatePhotoModal`
   - **Atualizar Descrição** → abre `GroupUpdateDescriptionModal`
   - **Adicionar Participante** → abre `GroupAddParticipantModal`
   - **Remover Participante** → abre `GroupRemoveParticipantModal`
   - **Promover Admin** → abre `GroupPromoteAdminModal`
   - **Remover Admin** → abre `GroupRemoveAdminModal`
   - **Configurações** → abre `GroupSettingsModal`
   - **Link de Convite** → abre `GroupInviteLinkModal`
   - Separador
   - **Remover da Campanha** → ação existente de delete (com confirmação)

3. **Estado local** para controlar qual modal está aberto e para qual grupo (usando `activeGroupAction` com `{ groupJid, instanceId, groupName, action }`)

4. Os modais recebem `onSuccess={() => refetch()}` para atualizar a lista após alterações

### Detalhes técnicos
- Cada `CampaignGroup` já possui `instanceId` e `groupJid` — são as props necessárias para os modais
- Grupos sem `instanceId` mostram apenas a opção de remover
- 1 arquivo modificado

