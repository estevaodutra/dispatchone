

## Adicionar paymentStatus e timer de vencimento nas instancias

### Resumo

Adicionar dois novos campos na tabela `instances` (`payment_status` e `expiration_date`), exibir o status de pagamento nos cards, mostrar um timer regressivo para vencimento, e auto-desconectar + notificar quando restar menos de 1 hora.

### 1. Database Migration

Adicionar 2 colunas na tabela `instances`:

```sql
ALTER TABLE public.instances ADD COLUMN payment_status TEXT DEFAULT NULL;
ALTER TABLE public.instances ADD COLUMN expiration_date TIMESTAMPTZ DEFAULT NULL;
```

### 2. Hook `useInstances.ts`

- Adicionar `payment_status` e `expiration_date` ao `DbInstance` interface
- Adicionar `paymentStatus` e `expirationDate` ao `Instance` interface
- Mapear no `transformDbToFrontend`
- Adicionar essas colunas ao tipo do `updates` no `updateInstanceMutation`

### 3. Webhook Response Handling (`triggerConnectionWebhook`)

No `Instances.tsx`, ao processar a resposta do webhook (que vem como array), extrair:
- `normalizedData.instance.paymentStatus` -> salvar como `payment_status`
- `normalizedData.instance.expirationDate` -> salvar como `expiration_date`
- `normalizedData.instance.id` -> salvar como `external_instance_id`
- `normalizedData.instance.token` -> salvar como `external_instance_token`
- `normalizedData["Client-Token"]` -> considerar salvar separadamente ou junto

Atualizar a logica que salva credenciais para usar o novo formato de resposta.

### 4. UI -- Card da Instancia

No card de cada instancia (apos o bloco de credentials), adicionar:

- **Badge de paymentStatus**: TRIAL (amarelo), ACTIVE (verde), EXPIRED (vermelho), etc.
- **Timer regressivo**: Mostra dias/horas/minutos restantes ate o vencimento
  - Verde: > 24h
  - Amarelo: < 24h
  - Vermelho: < 1h
  - Quando < 1h: auto-desconecta a instancia via `updateInstance({ status: "disconnected" })`

### 5. Auto-desconexao + Notificacao

Usar um `useEffect` com intervalo de 60s que:
1. Percorre todas as instancias conectadas com `expirationDate`
2. Se `expirationDate - now() < 1 hora`:
   - Chama `updateInstance({ id, updates: { status: "disconnected" } })`
   - Cria alerta na tabela `alerts` para o usuario com titulo "Instancia {nome} desconectada" e descricao sobre o vencimento proximo
   - Mostra toast de aviso

### 6. Arquivos Modificados

| Acao | Arquivo |
|------|---------|
| Migration | Adicionar `payment_status` e `expiration_date` na tabela `instances` |
| Editar | `src/hooks/useInstances.ts` (interfaces + transform + mutation types) |
| Editar | `src/pages/Instances.tsx` (webhook parsing, card UI, timer, auto-disconnect) |

