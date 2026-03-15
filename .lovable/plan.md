

## Adicionar aba "Config" nas Campanhas Pirata

### Visão Geral
Criar uma nova aba de configuração na tela de detalhes da campanha pirata com os campos: Link de Captura, Perfil (foto, nome, descrição, status), Oferta, Link de Pagamento e Destino (webhook ou sequência de disparo).

### 1. Migração de Banco
Adicionar novas colunas à tabela `pirate_campaigns`:

```sql
ALTER TABLE public.pirate_campaigns
  ADD COLUMN capture_link text,
  ADD COLUMN profile_photo_url text,
  ADD COLUMN profile_name text,
  ADD COLUMN profile_description text,
  ADD COLUMN profile_status text,
  ADD COLUMN offer_text text,
  ADD COLUMN payment_link text,
  ADD COLUMN destination_type text NOT NULL DEFAULT 'webhook',
  ADD COLUMN destination_sequence_id uuid,
  ADD COLUMN destination_campaign_id uuid;
```

- `destination_type`: `'webhook'` ou `'sequence'`
- Quando `webhook`, usa os campos `webhook_url`/`webhook_headers` já existentes
- Quando `sequence`, usa `destination_campaign_id` + `destination_sequence_id` para apontar para uma sequência de disparo

### 2. Atualizar Hook `usePirateCampaigns.ts`
- Adicionar os novos campos à interface `PirateCampaign`
- Mapear no `transform` e no `updateCampaign`

### 3. Criar componente `src/components/pirate-campaigns/tabs/PirateConfigTab.tsx`
Seguindo o padrão do `ConfigTab` de grupo/dispatch, com cards:

- **Link de Captura** -- Input para URL de redirecionamento ao grupo
- **Perfil** -- Upload de foto (usando `useMediaUpload`), inputs para nome, descrição e status
- **Oferta** -- Textarea para texto da oferta
- **Link de Pagamento** -- Input para URL
- **Destino** -- Select entre "Webhook" e "Sequência". Se webhook: inputs de URL e headers. Se sequência: selects de campanha de disparo e sequência (usando `useDispatchCampaigns` + `useDispatchSequences`)
- Botão "Salvar Alterações"

### 4. Atualizar `PirateCampaignDetails.tsx`
- Importar `PirateConfigTab` e ícone `Settings`
- Adicionar tab "Config" como primeira aba
- Mudar `activeTab` default para `"config"`

### Arquivos alterados
- Migração SQL (novas colunas)
- `src/hooks/usePirateCampaigns.ts` (interface + transform + update)
- `src/components/pirate-campaigns/tabs/PirateConfigTab.tsx` (novo)
- `src/components/pirate-campaigns/PirateCampaignDetails.tsx` (nova aba)

