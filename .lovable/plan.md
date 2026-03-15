

## Implementar Campanhas Pirata -- Monitoramento de Grupos WhatsApp

### Visao Geral

Implementar a funcionalidade completa de "Campanhas Pirata" que monitora grupos do WhatsApp via webhook-inbound existente e captura leads que entram nos grupos monitorados. Envolve criacao de 3 tabelas, 1 edge function, 1 hook, e ~6 componentes de UI.

### 1. Database -- 3 tabelas + 1 funcao SQL

**Migration SQL:**

```sql
-- Tabela principal de campanhas pirata
CREATE TABLE public.pirate_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  instance_id UUID REFERENCES public.instances(id),
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT,
  webhook_headers JSONB DEFAULT '{}',
  auto_create_lead BOOLEAN DEFAULT true,
  ignore_duplicates BOOLEAN DEFAULT false,
  target_campaign_id UUID,
  status TEXT DEFAULT 'active',
  total_leads_captured INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pirate_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage pirate_campaigns"
  ON public.pirate_campaigns FOR ALL TO authenticated
  USING (is_company_member(company_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_company_member(company_id, auth.uid()) OR user_id = auth.uid());

-- Grupos vinculados a campanhas pirata
CREATE TABLE public.pirate_campaign_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.pirate_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  leads_captured INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, group_jid)
);

ALTER TABLE public.pirate_campaign_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pirate_campaign_groups"
  ON public.pirate_campaign_groups FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Leads capturados
CREATE TABLE public.pirate_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.pirate_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  phone TEXT NOT NULL,
  lid TEXT,
  lead_id UUID,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMPTZ,
  webhook_response_status INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pirate_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage pirate_leads"
  ON public.pirate_leads FOR ALL TO authenticated
  USING (is_company_member(company_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_company_member(company_id, auth.uid()) OR user_id = auth.uid());

CREATE INDEX idx_pirate_leads_campaign ON public.pirate_leads(campaign_id);
CREATE INDEX idx_pirate_leads_duplicate ON public.pirate_leads(campaign_id, phone);

-- Funcao para incrementar contadores
CREATE OR REPLACE FUNCTION public.increment_pirate_counters(
  p_campaign_id UUID, p_group_jid TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pirate_campaigns SET total_leads_captured = total_leads_captured + 1, updated_at = now() WHERE id = p_campaign_id;
  UPDATE pirate_campaign_groups SET leads_captured = leads_captured + 1, updated_at = now() WHERE campaign_id = p_campaign_id AND group_jid = p_group_jid;
END;
$$;
```

### 2. Edge Function -- `pirate-process-join`

Nova edge function `supabase/functions/pirate-process-join/index.ts` invocada pelo `webhook-inbound` quando detecta evento `group_join`.

Fluxo:
1. Recebe `group_jid`, `phone`, `lid`, `instance_id` do webhook-inbound
2. Busca `pirate_campaign_groups` ativas para esse `group_jid` (via service role, sem RLS)
3. Para cada campanha ativa:
   - Verifica duplicado se `ignore_duplicates = true`
   - Cria lead na tabela `leads` se `auto_create_lead = true`
   - Insere registro em `pirate_leads`
   - Dispara webhook do usuario via fetch POST
   - Chama `increment_pirate_counters`

Config em `supabase/config.toml`:
```toml
[functions.pirate-process-join]
verify_jwt = false
```

### 3. Modificar `webhook-inbound` -- Auto-processar `group_join`

Adicionar bloco no `webhook-inbound/index.ts` (apos o bloco de poll_response, ~linha 665) para detectar `group_join` e invocar `pirate-process-join`:

```typescript
if (classification.eventType === "group_join") {
  // Extract participants and group info, invoke pirate-process-join
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  await fetch(`${supabaseUrl}/functions/v1/pirate-process-join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
    body: JSON.stringify({
      group_jid: context.chatJid,
      phone: context.senderPhone,
      instance_id: instance?.id,
      raw_event: rawEvent
    })
  });
}
```

### 4. Hook -- `usePirateCampaigns`

`src/hooks/usePirateCampaigns.ts` -- seguindo o padrao de `useGroupCampaigns`:
- `useQuery` para listar campanhas filtradas por `company_id`
- `useMutation` para create, update, delete
- Queries para `pirate_campaign_groups` e `pirate_leads`

`src/hooks/usePirateGroups.ts` -- gerenciar grupos vinculados a uma campanha:
- Listar, adicionar, remover grupos
- Reutilizar o mecanismo de listagem de grupos do GroupsListTab (webhook `group.list`)

`src/hooks/usePirateLeads.ts` -- listar leads capturados com filtros

### 5. Componentes de UI

**Estrutura de arquivos:**
```
src/components/pirate-campaigns/
  PirateCampaignList.tsx      -- Grid de cards (similar ao GroupCampaignList)
  PirateCampaignDetails.tsx   -- Detalhes com tabs (Grupos + Leads)
  CreatePirateCampaignDialog.tsx -- Dialog wizard 4 passos
  tabs/
    PirateGroupsTab.tsx       -- Listar/adicionar/remover grupos monitorados
    PirateLeadsTab.tsx        -- Tabela de leads capturados
  index.ts
```

**`PirateCampaignList.tsx`** -- Cards com nome, instancia, qtd grupos, leads capturados, status badge (ativo/pausado/parado), acoes (configurar/pausar/excluir).

**`CreatePirateCampaignDialog.tsx`** -- Dialog com 4 steps:
1. Dados basicos (nome, descricao, instancia WhatsApp)
2. Selecionar grupos (reutilizar mecanismo de listagem via webhook `group.list`)
3. Configuracoes (auto_create_lead, ignore_duplicates, campanha destino)
4. Webhook (URL, headers, previa do payload, botao testar)

**`PirateCampaignDetails.tsx`** -- Header com metricas (total, hoje, semana, grupos), tabs Grupos e Leads.

**`PirateGroupsTab.tsx`** -- Lista grupos monitorados com stats, botoes pausar/remover, botao adicionar grupo.

**`PirateLeadsTab.tsx`** -- Tabela com colunas: telefone, grupo, entrou em, lead criado, webhook status. Filtros por grupo e periodo.

### 6. Pagina `PirateCampaigns.tsx`

Substituir o placeholder atual por componente funcional similar ao `GroupCampaigns.tsx`:
- Estado para `selectedCampaign`
- Lista ou detalhes conforme selecao
- Dialog de criacao

### 7. Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Migration | 3 tabelas + 1 funcao SQL + RLS + indices |
| Criar | `supabase/functions/pirate-process-join/index.ts` |
| Editar | `supabase/functions/webhook-inbound/index.ts` (add group_join handler) |
| Editar | `supabase/config.toml` (add pirate-process-join) |
| Criar | `src/hooks/usePirateCampaigns.ts` |
| Criar | `src/hooks/usePirateGroups.ts` |
| Criar | `src/hooks/usePirateLeads.ts` |
| Criar | `src/components/pirate-campaigns/PirateCampaignList.tsx` |
| Criar | `src/components/pirate-campaigns/PirateCampaignDetails.tsx` |
| Criar | `src/components/pirate-campaigns/CreatePirateCampaignDialog.tsx` |
| Criar | `src/components/pirate-campaigns/tabs/PirateGroupsTab.tsx` |
| Criar | `src/components/pirate-campaigns/tabs/PirateLeadsTab.tsx` |
| Criar | `src/components/pirate-campaigns/index.ts` |
| Editar | `src/pages/campaigns/PirateCampaigns.tsx` (substituir placeholder) |

