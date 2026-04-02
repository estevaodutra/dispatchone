

## Plano: Adicionar categoria "Gestão de Grupo" no Sequence Builder

### O que muda

Adicionar uma 5ª categoria de nós chamada **"Gestão de Grupo"** no construtor de sequências, com os seguintes componentes arrastáveis:

| Nó | Ícone | Config |
|---|---|---|
| `group_rename` | Pencil | Campo: novo nome |
| `group_photo` | ImageIcon | Upload de foto (MediaUploader) |
| `group_description` | FileText | Textarea: nova descrição |
| `group_add_participant` | UserPlus | Lista de números |
| `group_remove_participant` | UserMinus | Número do participante |
| `group_promote_admin` | ShieldPlus | Número do participante |
| `group_remove_admin` | ShieldMinus | Número do participante |
| `group_settings` | Settings | 4 toggles (adminOnly...) |

### Arquivos alterados

**1. `src/components/group-campaigns/sequences/SequenceBuilder.tsx`**
- Adicionar nova categoria `{ id: "group_management", label: "Gestão de Grupo", nodes: [...] }` ao array `NODE_CATEGORIES`
- Adicionar configs default para cada novo tipo no `getDefaultConfig`

**2. `src/components/sequences/UnifiedNodeConfigPanel.tsx`**
- Adicionar entradas no `NODE_TITLES` para os 8 novos tipos
- Adicionar blocos de renderização condicional (`node.nodeType === "group_rename"`, etc.) com formulários de configuração específicos para cada ação
- Cada formulário configura os campos que serão enviados à Z-API quando o nó for executado na sequência

**3. `supabase/functions/execute-message/index.ts`** (se necessário)
- Adicionar handlers para os novos tipos de nó que chamam o `zapi-proxy` com os endpoints correspondentes

### Detalhes técnicos
- Os nós de gestão de grupo NÃO são "sendable" (não entram em `SENDABLE_NODE_TYPES` — não têm agendamento)
- Cada nó armazena sua config (nome, número, toggles) e na execução da sequência a Edge Function chama o endpoint Z-API correspondente
- Reutiliza o padrão existente de config panel com formulários inline

