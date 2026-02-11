

# Adicionar campo de campanha na importacao em massa via API (Edge Function)

## Problema

O frontend (`useLeads.ts`) ja suporta os campos `campaignId` e `campaignType` na importacao de leads, mas a Edge Function `leads-api` (endpoint `POST /leads/import`) ignora esses campos. Leads importados via API nao recebem atribuicao de campanha.

## Alteracao

### `supabase/functions/leads-api/index.ts` -- endpoint POST /leads/import

Atualizar a logica de importacao para:

1. Aceitar `campaign_id` e `campaign_type` por lead no array `leads`
2. Aceitar `default_campaign_id` e `default_campaign_type` no objeto `options`
3. No insert, incluir `active_campaign_id` e `active_campaign_type` (prioridade: valor do lead > valor padrao do options)
4. No update (quando duplicado + `update_existing`), tambem atualizar os campos de campanha

### Payload esperado apos a mudanca

```json
{
  "leads": [
    {
      "phone": "5511999999999",
      "name": "Joao",
      "email": "joao@email.com",
      "tags": ["vip"],
      "campaign_id": "uuid-da-campanha",
      "campaign_type": "call"
    }
  ],
  "options": {
    "default_tags": ["importado"],
    "update_existing": true,
    "default_campaign_id": "uuid-fallback",
    "default_campaign_type": "dispatch"
  }
}
```

### Logica de prioridade

- Se o lead individual tem `campaign_id`, usa ele
- Senao, usa `default_campaign_id` do options
- Se nenhum, nao atribui campanha (comportamento atual)

## Detalhes tecnicos

- Apenas a Edge Function sera alterada. O frontend ja esta preparado.
- Os campos `active_campaign_id` e `active_campaign_type` ja existem na tabela `leads`, nao ha necessidade de migracao.

