

## Problema

Na função `loadCampaignMeta` (linha 181-200), as tags vindas da tabela `leads` são adicionadas com `count: 0` hardcoded. Além disso, tags existentes no `call_leads.custom_fields.tags` só contam os call_leads, não os leads vinculados.

## Correção

**`src/components/call-panel/CreateQueueDialog.tsx`** — linhas 180-200:

1. Buscar tags da tabela `leads` apenas para leads vinculados à campanha (via `lead_id` dos `call_leads` já carregados)
2. Contar quantos leads têm cada tag, em vez de hardcodar `0`
3. Mesclar as contagens: se a tag já existe no `tagMap` (do custom_fields), somar; se não, usar a contagem da tabela leads

Lógica:
- Coletar todos os `lead_id` dos call_leads carregados
- Buscar `leads` com `id in (lead_ids)` e `tags != {}`  
- Para cada tag encontrada, contar quantos leads a possuem e atualizar o `tagMap`

