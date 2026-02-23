

# Ajustar colunas Origem, Grupo e Tags na pagina de Leads

## Resumo

Corrigir o mapeamento das colunas para que:
- **Origem**: Mostre o nome da campanha (ex: "Clientes VIP")
- **Tipo**: Mantenha como esta (correto)
- **Grupo**: Mostre o nome real do grupo WhatsApp (ex: "@achadinhoscomcarol 10")
- **Tags**: Sejam apenas manuais -- remover a tag automatica "grupo" do sync

## Mudancas

### 1. `src/pages/Leads.tsx` -- handleSync

Atualizar a funcao de sincronizacao para:
- Buscar tambem os grupos vinculados (`campaign_groups`) para obter o nome real do grupo WhatsApp
- Preencher `source_group_name` com o nome do grupo WhatsApp (de `campaign_groups.group_name`), nao o nome da campanha
- Preencher `source_name` com o nome da campanha (de `group_campaigns.name`) para usar na coluna Origem
- Remover `tags: ["grupo"]` do upsert -- tags serao apenas manuais

### 2. `src/pages/Leads.tsx` -- Coluna Origem

Trocar de `SOURCE_LABELS[lead.source_type]` para mostrar `lead.source_name` (nome da campanha). Caso nao tenha, usar o label generico como fallback.

### 3. `src/hooks/useGroupMembers.ts` -- addMember e addMembersBulk

Remover `tags: ["grupo"]` dos upserts de leads para que tags sejam apenas manuais.

## Detalhes tecnicos

### handleSync atualizado

```text
const handleSync = async () => {
  // Busca campanhas de grupo
  const { data: gcList } = await supabase.from("group_campaigns").select("id, name");
  const gcMap = new Map((gcList || []).map(g => [g.id, g.name]));

  // Busca grupos vinculados para nome real do grupo WhatsApp
  const { data: cgList } = await supabase.from("campaign_groups").select("campaign_id, group_jid, group_name");
  // Mapa: campaign_id -> primeiro group_name encontrado
  const groupNameMap = new Map<string, string>();
  (cgList || []).forEach(cg => {
    if (!groupNameMap.has(cg.campaign_id)) {
      groupNameMap.set(cg.campaign_id, cg.group_name);
    }
  });

  // ... fetch members ...

  const leadRecords = validMembers.map(m => ({
    user_id: user.id,
    phone: m.phone,
    name: m.name || null,
    // SEM tags automaticas
    active_campaign_id: m.group_campaign_id,
    active_campaign_type: "grupos",
    status: "active",
    source_type: "whatsapp_group",
    source_name: gcMap.get(m.group_campaign_id) || null,       // nome da campanha
    source_group_id: m.group_campaign_id,
    source_group_name: groupNameMap.get(m.group_campaign_id) || null, // nome do grupo WhatsApp
  }));
};
```

### Coluna Origem na tabela

```text
// Antes:
{SOURCE_LABELS[lead.source_type || ""] || "---"}

// Depois:
{lead.source_name || SOURCE_LABELS[lead.source_type || ""] || "---"}
```

### Arquivos modificados

- `src/pages/Leads.tsx` (handleSync, coluna Origem)
- `src/hooks/useGroupMembers.ts` (remover tags automaticas dos upserts)
