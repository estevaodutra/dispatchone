## Objetivo

Fazer a página **Leads** mostrar também o **nome da campanha** quando o lead foi enviado direto para uma campanha de ligação.

## Problema atual

O vínculo já existe:
- `active_campaign_id` está preenchido
- `active_campaign_type = 'ligacao'`

Por isso o lead aparece como **Em Campanha**.

Mas o nome da campanha não aparece na listagem porque a coluna **Origem** depende de `source_name`, e esse campo não está sendo preenchido no fluxo de leads criados direto pela campanha.

## Implementação

### 1. Preencher `source_name` ao espelhar leads da campanha para a base global
Arquivo: `src/hooks/useCallLeads.ts`

Nos fluxos abaixo:
- `addLeadMutation`
- `addLeadsBatchMutation`

Antes do `upsert` em `leads`, buscar o nome da campanha (`call_campaigns.name`) usando o `campaignId` atual do hook e salvar junto com:
- `source_name = nome da campanha`
- `source_type = 'campaign_manual'`
- `source_campaign_id = campaignId`
- `active_campaign_id = campaignId`
- `active_campaign_type = 'ligacao'`

Assim, novos leads já entrarão na página Leads com o nome da campanha visível.

### 2. Atualizar os leads que já foram sincronizados
Executar um backfill para preencher `source_name` nos leads já existentes:

```sql
UPDATE public.leads l
SET source_name = cc.name
FROM public.call_campaigns cc
WHERE l.source_type = 'campaign_manual'
  AND l.source_campaign_id = cc.id
  AND (l.source_name IS NULL OR l.source_name = '');
```

### 3. Melhorar fallback visual na página Leads
Arquivo: `src/pages/Leads.tsx`

Adicionar o label para `campaign_manual` em `SOURCE_LABELS`, para que mesmo se `source_name` vier vazio em algum caso excepcional, a coluna **Origem** mostre pelo menos algo útil, como:
- `campaign_manual: "Campanha (manual)"`

## Resultado esperado

Na página **Leads**, para leads enviados direto para campanha, ficará visível:
- **Tipo**: Ligação
- **Origem**: nome da campanha, por exemplo `AutoConsultas | ColdCall | Proteção Veicular`

## Arquivos / mudanças

- `src/hooks/useCallLeads.ts`
- `src/pages/Leads.tsx`
- 1 migration SQL de backfill de dados

## Fora do escopo

- Alterar layout da tabela de Leads
- Criar nova coluna separada só para “Campanha”

Se você aprovar, eu aplico essa correção agora.