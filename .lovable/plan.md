# Sistema de Carteira e Créditos

Implementação completa do sistema de carteira por **company**, com recarga via PIX (Mercado Pago via webhook n8n), consumo por ligação/URA, reservas, extrato e alertas. Todas as operações financeiras serão atômicas via funções SQL `SECURITY DEFINER`.

## Fases de Entrega

Para evitar uma entrega gigantesca, vou dividir em **2 grandes blocos** dentro deste plano. Tudo será implementado em sequência no mesmo build:

- **Bloco A — MVP (Fases 1+2)**: tabelas, página `/carteira`, recarga PIX, webhook de confirmação, reserva/débito em ligação, débito em URA.
- **Bloco B — Extrato e Configurações (Fases 3+4)**: página de extrato com filtros, página de configurações, alertas de saldo baixo, limite diário.

## Arquitetura de Dados

4 tabelas novas com RLS multi-tenant via `is_company_member` / `is_company_admin` (padrão do projeto):

- `wallets` — uma carteira por `company_id` (UNIQUE). Campos: `balance`, `reserved_balance`, `low_balance_alert`, `alert_email_enabled`, `daily_limit`, `daily_spent`, `daily_spent_date`.
- `wallet_transactions` — extrato imutável: `type` (deposit/consumption/adjustment/refund), `category` (pix/call/ura/manual), `amount` (sinal indica crédito/débito), `balance_before`, `balance_after`, `description`, `metadata` JSONB, `reference_type`/`reference_id`, `status`.
- `wallet_reservations` — reservas temporárias durante ligações ativas: `amount`, `category`, `reference_type`/`reference_id`, `status` (active/finalized/cancelled), `finalized_amount`.
- `wallet_payments` — pagamentos PIX: `amount`, `mp_payment_id`, `mp_qr_code`, `mp_qr_code_base64`, `mp_ticket_url`, `status` (pending/approved/rejected/expired), `expires_at`, `paid_at`.

Tabela `pricing_rules` **fora do MVP** — preços ficarão em constantes em uma única edge function compartilhada (`_shared/pricing.ts`) com defaults: `CALL_PER_MINUTE = 0.40`, `URA_PER_30_SECONDS = 0.15`. Migrar para tabela depois quando precisar de planos diferenciados.

### Trigger automático

Trigger `AFTER INSERT ON companies` cria a `wallet` automaticamente (mesmo padrão usado para `call_operators`). Backfill cria wallets para companies existentes.

### Funções SQL atômicas (SECURITY DEFINER)

Para garantir consistência (sem race condition entre saldo e reserva):

- `wallet_reserve(company_id, amount, category, ref_type, ref_id)` → cria reserva, incrementa `reserved_balance`. Falha com erro `INSUFFICIENT_BALANCE` se `balance - reserved_balance < amount`.
- `wallet_finalize_reservation(reservation_id, actual_amount)` → debita `actual_amount` do `balance`, libera reserva, cria transação. Se `actual_amount = 0` apenas libera.
- `wallet_cancel_reservation(reservation_id)` → libera reserva sem débito.
- `wallet_debit(company_id, amount, category, description, ref_type, ref_id, metadata)` → débito direto (URA), valida saldo, cria transação.
- `wallet_credit(company_id, amount, category, description, ref_type, ref_id, metadata)` → crédito (recarga aprovada, ajuste, estorno).

Todas atualizam `daily_spent` quando aplicável e respeitam `daily_limit` (na fase B).

## Bloco A — MVP

### 1. Migration

Cria as 4 tabelas, RLS, trigger de auto-criação de wallet, backfill, e as 5 funções SQL.

### 2. Edge Functions

**`create-pix-payment`** (verify_jwt = true)
- Valida valor mínimo R$ 250.
- Resolve `company_id` do usuário autenticado, busca/cria wallet.
- Cria `wallet_payments` com `status='pending'` e `expires_at = now()+30min`.
- POST para `https://n8n-n8n.nuwfic.easypanel.host/webhook/gerar_pix` enviando `{ company_id, payment_id, amount, description, payer_email, payer_name }`.
- Aguarda resposta n8n com `qr_code`, `qr_code_base64`, `ticket_url`, `mp_payment_id`.
- Atualiza `wallet_payments` e retorna ao frontend.

**`webhook-payment-confirmation`** (verify_jwt = false)
- Chamado pelo n8n quando MP confirma. Recebe `{ payment_id, mp_payment_id, status, amount, paid_at }`.
- Idempotente: se já `approved`, retorna 200 sem reprocessar.
- Se `approved`: chama `wallet_credit()` e atualiza pagamento.
- Se `rejected`/`expired`: apenas atualiza status.

**`wallet-reserve`** / **`wallet-finalize`** / **`wallet-cancel`** (verify_jwt = false, chamadas server-side)
- Wrappers finos sobre as RPCs SQL — usadas pela `call-dial` e `call-status`.

### 3. Integração com Ligação (modificar funções existentes)

- **`call-dial/index.ts`**: antes de discar, chama `wallet_reserve(company_id, 0.80, 'call', 'call_log', call_log_id)` (estimativa 2min). Se erro `INSUFFICIENT_BALANCE`, marca `call_log` como `failed` com motivo `no_balance` e retorna 402.
- **`call-status/index.ts`**: na transição para `completed`/`busy`/`no_answer`/etc:
  - Busca reserva ativa por `reference_id = call_log.id`.
  - Se `duration_seconds > 0` e `call_status = 'completed'`: chama `wallet_finalize_reservation(reservation_id, calculateCallCost(duration_seconds))`.
  - Caso contrário (não conectou): chama `wallet_cancel_reservation()`.

### 4. Integração com URA

URA é processada externamente (n8n). A própria função n8n chamará a edge function `wallet-debit-ura` com `{ company_id, duration_seconds, ura_session_id }`. Antes do disparo, n8n consulta `check-balance`.

### 5. Frontend

**Sidebar** (`src/components/layout/AppSidebar.tsx`): adicionar item "Carteira" com ícone `Wallet` em `mainNavItems`, entre "Leads" e "Agendamentos".

**Roteamento** (`src/App.tsx`): rotas `/carteira`, `/carteira/extrato`, `/carteira/configuracoes` (todas dentro de `AppLayout` + `ProtectedRoute`).

**Hook** `src/hooks/useWallet.ts` — react-query para wallet, transactions, payments. Subscreve realtime em `wallets` (filter por `company_id`) para atualizar saldo após confirmação PIX.

**Página `src/pages/wallet/WalletPage.tsx`**:
- Card grande com saldo, badge de status (verde/amarelo/vermelho), estimativa de minutos.
- Seção de recarga rápida (4 botões + input personalizado, mín R$ 250).
- Últimas 5 transações + link "Ver extrato completo".
- Card "Consumo do mês" com total e breakdown ligações/URA. Gráfico de barras (recharts já no projeto).

**Componente `AddBalanceDialog.tsx`** (3 etapas):
1. Escolher valor.
2. Mostrar QR Code + código copia-e-cola + timer 30min + status "Aguardando pagamento". Polling a cada 5s no `wallet_payments.status`.
3. Confirmação ✅ com novo saldo.

## Bloco B — Extrato, Configurações e Alertas

### 6. Página `/carteira/extrato` (`ExtratoPage.tsx`)

- Filtros: período (Hoje/7d/30d/Personalizado) e tipo (Todos/Recargas/Consumo/Ajustes).
- Tabela paginada (range explícito do Supabase, padrão do projeto): Data, Tipo (badge), Descrição, Valor (verde/vermelho), Saldo após.
- Resumo do período: total recargas, total consumo, saldo inicial → final.

### 7. Página `/carteira/configuracoes` (`WalletSettingsPage.tsx`)

- Toggle alertas + input limite mínimo + toggle email + toggle notificação.
- Toggle limite diário + input valor + radio "Bloquear / Apenas alertar".
- Apenas admins (`useCompany().isAdmin`) podem editar.

### 8. Alertas

- Tabela `wallet_alerts (wallet_id, kind, created_at)` para deduplicação 24h.
- Edge function `wallet-low-balance-checker` agendada via `pg_cron` a cada 1h: busca wallets com `balance < low_balance_alert`, verifica dedupe 24h, insere `alerts` (tabela existente) e dispara email via Lovable AI Gateway / função existente de email.
- Após cada `wallet_debit`/`wallet_finalize_reservation`, se cair abaixo do limite, mesmo fluxo é disparado.

### 9. Limite Diário

Função `wallet_debit` reseta `daily_spent` quando `daily_spent_date != current_date` e bloqueia se `daily_spent + amount > daily_limit` (quando `daily_limit IS NOT NULL` e modo "Bloquear").

## Detalhes Técnicos

### Fluxo PIX (resumo)

```text
Frontend (AddBalanceDialog)
   │ POST create-pix-payment
   ▼
Edge: create-pix-payment ──► n8n /webhook/gerar_pix ──► Mercado Pago
   ◄────────── QR Code ──────────────────────────────────┘
   │ grava em wallet_payments
   ▼
Frontend exibe QR + polling status
                                          Cliente paga PIX
                                                  │
                                                  ▼
                              MP ──► n8n ──► Edge: webhook-payment-confirmation
                                                          │ wallet_credit()
                                                          ▼
                                                wallet.balance += amount
                                                          │
                                                          ▼
                              Realtime/polling atualiza UI
```

### Fluxo de Ligação

1. `call-dial` reserva R$ 0,80 (2 min estimados) em `wallet_reservations`.
2. Discagem segue o fluxo atual.
3. `call-status` recebe terminação:
   - `completed` + `duration_seconds`: finaliza com `Math.ceil(duration_seconds/60) * 0.40`.
   - Outros (no_answer, busy, voicemail, failed, cancelled, timeout): cancela reserva (estorno automático).

### Mercado Pago — Secret

Para Bloco A, a chave do MP fica no n8n (não no Lovable). A única integração com n8n é a URL pública do webhook `gerar_pix` (já fornecida) — não precisa secret. O webhook reverso (`webhook-payment-confirmation`) será protegido por uma `WEBHOOK_PIX_SECRET` simples, enviada pelo n8n no header `x-webhook-secret`. Vou pedir essa secret antes de implementar essa edge function.

### RLS

- `wallets`: SELECT/UPDATE para membros da company; INSERT só por trigger.
- `wallet_transactions`: SELECT para membros; INSERT/UPDATE só por funções `SECURITY DEFINER`.
- `wallet_reservations`: SELECT para membros; mutações só via funções.
- `wallet_payments`: SELECT/INSERT para membros; UPDATE só por função.

### Não cobertos neste plano (futuros)

- Tabela `pricing_rules` por plano/cliente (preços ficam em constantes).
- Exportação CSV do extrato.
- Estorno manual via UI admin (pode ser feito via SQL por enquanto).
- Internacionalização das novas strings (PT-only inicialmente, seguindo padrão das páginas mais novas).

## Próximos Passos

Após sua aprovação:
1. Crio a migration (Bloco A) + funções SQL.
2. Implemento as edge functions de PIX e wallet.
3. Crio o frontend `/carteira` com recarga.
4. Integro débito em `call-dial` e `call-status`.
5. Vou pedir a `WEBHOOK_PIX_SECRET` antes de finalizar `webhook-payment-confirmation`.
6. Em seguida implemento Bloco B (extrato, configurações, alertas).
