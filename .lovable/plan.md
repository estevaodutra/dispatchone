

## Plano: Novo nó "Enviar para Webhook" com dados do lead e campanha

### Objetivo
Adicionar um novo tipo de nó na sequência que envia automaticamente todas as informações do lead e da campanha para uma URL de webhook configurada pelo usuário. Diferente do nó "Webhook" atual (que envia um body customizado), este novo nó monta o payload automaticamente.

### Alterações

**1. Frontend — Adicionar nó na categoria "Fluxo"**

`src/components/group-campaigns/sequences/SequenceBuilder.tsx`:
- Adicionar tipo `webhook_forward` na categoria "Fluxo" (ícone `Send`/`Webhook`, label "Enviar p/ Webhook")
- Adicionar default config: `{ url: "", method: "POST", headers: {}, includeInstance: true, includeGroups: true, customPayload: "" }`

`src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`:
- Adicionar o mesmo nó na categoria equivalente

**2. Frontend — Painel de configuração do nó**

`src/components/sequences/UnifiedNodeConfigPanel.tsx`:
- Adicionar entrada no `NODE_TITLES` para `webhook_forward`
- Adicionar seção de configuração com:
  - Campo URL (obrigatório)
  - Headers customizados (chave/valor, opcional)
  - Toggle "Incluir dados da instância"
  - Toggle "Incluir dados dos grupos"
  - Campo JSON adicional (opcional, para mesclar com o payload automático)
- O payload automático conterá: dados do lead/contato (phone, name, jid, customFields), dados da campanha (id, name), dados da instância e grupos

**3. Backend — Processar o nó no execute-message**

`supabase/functions/execute-message/index.ts`:
- Adicionar tratamento para `node_type === "webhook_forward"`
- Montar payload automático com:
  - `event: "sequence.webhook_forward"`
  - `lead: { phone, name, jid, customFields }`
  - `campaign: { id, name }`
  - `instance: { id, name, phone, provider }`
  - `groups: [{ jid, name }]`
  - `sequence: { id, name }`
  - `node: { id, type, order }`
  - `timestamp`
  - Merge com `customPayload` se fornecido
- Fazer POST/GET para a URL configurada com os headers
- Registrar resultado no log

**4. Mapeamento de ação**

`src/lib/webhook-utils.ts`:
- Adicionar `webhook_forward: "webhook.forward"` no `NODE_TYPE_TO_ACTION`

### Arquivos
- `src/components/group-campaigns/sequences/SequenceBuilder.tsx`
- `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`
- `src/components/sequences/UnifiedNodeConfigPanel.tsx`
- `supabase/functions/execute-message/index.ts`
- `src/lib/webhook-utils.ts`

