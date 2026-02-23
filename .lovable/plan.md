
# Popular a campanha "IPTV | Disparo de Ligacoes" com os leads existentes

## Situacao Atual

A campanha "IPTV | Disparo de Ligacoes" (ID: `95c32f25-9bc8-4b6b-853a-ffc1e857ad50`) esta completamente vazia:
- 0 registros em `call_leads`
- 0 registros em `call_logs`
- 0 registros em `call_queue`

Existem 934 leads na tabela `leads` do usuario. Esses leads precisam ser copiados para `call_leads` para aparecerem na aba de Leads da campanha.

## Plano

### 1. Inserir leads na tabela `call_leads`

Executar uma query SQL que copia todos os leads do usuario para a campanha, usando INSERT com dados da tabela `leads`:

```text
INSERT INTO call_leads (campaign_id, user_id, phone, name, email, status)
SELECT
  '95c32f25-9bc8-4b6b-853a-ffc1e857ad50',
  user_id,
  phone,
  name,
  email,
  'pending'
FROM leads
WHERE user_id = (SELECT user_id FROM call_campaigns WHERE id = '95c32f25-9bc8-4b6b-853a-ffc1e857ad50')
ON CONFLICT (phone, campaign_id) DO NOTHING;
```

### 2. Atualizar `active_campaign_id` nos leads

Atualizar os leads na tabela `leads` para vincular a campanha de ligacao:

```text
UPDATE leads
SET active_campaign_id = '95c32f25-9bc8-4b6b-853a-ffc1e857ad50',
    active_campaign_type = 'ligacao'
WHERE user_id = (SELECT user_id FROM call_campaigns WHERE id = '95c32f25-9bc8-4b6b-853a-ffc1e857ad50');
```

## Resultado Esperado

Apos a execucao, os ~934 leads aparecerão na aba "Leads" da campanha "IPTV | Disparo de Ligacoes" com status "Pendente", prontos para serem discados.

## Detalhes Tecnicos

- A constraint UNIQUE em `(phone, campaign_id)` garante que nao havera duplicatas
- `ON CONFLICT DO NOTHING` ignora telefones duplicados silenciosamente
- Os leads serao inseridos com status `pending`, permitindo posterior enfileiramento
- A operacao sera feita via ferramenta de insercao do banco de dados (nao via migracao)
