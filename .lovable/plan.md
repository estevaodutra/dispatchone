

## Plano: Extrair Leads de Grupos do WhatsApp

### Dados existentes (sem migração necessária)
- `campaign_groups`: grupos vinculados (group_jid, group_name, campaign_id)
- `group_members`: membros dos grupos (phone, name, is_admin, group_campaign_id)
- `leads`: já tem source_type, source_group_id, source_group_name

### Alterações

**1. Novo componente `src/components/leads/ExtractLeadsDialog.tsx`**
- Modal com 3 passos: Selecionar Grupos → Configurar → Prévia
- Query `campaign_groups` + contagem de `group_members` por grupo para listar grupos disponíveis com busca e seleção múltipla
- Configuração: campanha destino (agrupada por tipo), tags opcionais, checkboxes (ignorar existentes, ignorar inválidos, ignorar admins, manter referência)
- Prévia: calcula totais antes de executar
- Progresso: barra de progresso por grupo durante extração
- Resultado: tabela resumo com detalhes por grupo
- Lógica de extração: busca membros de `group_members`, valida, upsert em `leads` com source_type="whatsapp_group", sincroniza com `call_leads`/`dispatch_campaign_contacts` conforme tipo de campanha

**2. Atualizar `src/pages/Leads.tsx`**
- Substituir botão "Sincronizar" por dropdown "📥 Extrair" com 3 opções:
  - "De Grupos do WhatsApp" → abre ExtractLeadsDialog
  - "De Planilha (CSV/Excel)" → abre ImportLeadsDialog existente
  - "De API Externa" → placeholder/toast
- Adicionar estado `extractOpen` e renderizar `ExtractLeadsDialog`

**3. Atualizar `src/components/leads/index.ts`**
- Exportar `ExtractLeadsDialog`

