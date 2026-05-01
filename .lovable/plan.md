# Painel do Superadmin

Painel global em `/admin` para gerenciar toda a plataforma, separado do app cliente. Reusa autenticação existente, mas com layout, sidebar e roteamento próprios.

## Decisão importante de segurança

O prompt sugere `profiles.is_superadmin BOOLEAN`. **Vou divergir**: o projeto já tem o padrão correto com a tabela `user_roles` + enum `app_role` + função `has_role()` (security definer). Adicionar uma flag em `profiles` quebraria o padrão e abriria risco de privilege escalation (regra core do projeto). Em vez disso:

- Adiciono o valor `'superadmin'` ao enum `public.app_role`
- Crio função `public.is_superadmin(uuid)` (security definer, igual ao padrão `is_company_admin`)
- Promoção/demissão de superadmin = INSERT/DELETE em `user_roles` (apenas outro superadmin pode fazer)

## Fase 1 — Base, Dashboard, RLS

### Migration

```sql
-- 1. Estende enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Função helper
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles
                     WHERE user_id = _user_id AND role = 'superadmin') $$;

-- 3. Tabelas novas
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text, target_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ... (admin, action, target, created);

CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid, updated_at timestamptz DEFAULT now()
);
INSERT INTO platform_settings (key, value, description) VALUES
  ('min_recharge_amount', '250', '...'),
  ('recharge_presets', '[250,500,1000,2000]', '...'),
  ('low_balance_alert', '50', '...'),
  ('maintenance_mode', 'false', '...'),
  ('maintenance_message', '""', '...');

CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,            -- NULL = preço global
  action_type text NOT NULL,  -- 'call' | 'ura'
  unit text NOT NULL,         -- 'minute' | '30s'
  price numeric(10,4) NOT NULL,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS — somente superadmin
ALTER TABLE admin_logs ENABLE RLS;
CREATE POLICY "Superadmin full access" ON admin_logs FOR ALL TO authenticated
  USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));
-- mesmo padrão para platform_settings e pricing_rules

-- 5. Policies adicionais para superadmin VER tudo (sem precisar ser membro)
CREATE POLICY "Superadmin can view all companies" ON companies FOR SELECT
  TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all wallets" ON wallets FOR SELECT
  TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all transactions" ON wallet_transactions
  FOR SELECT TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all members" ON company_members FOR SELECT
  TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can view all profiles" ON profiles FOR SELECT
  TO authenticated USING (is_superadmin(auth.uid()));
-- (similares para wallet_payments, call_logs se necessário em métricas)
```

### Frontend

- `src/hooks/useSuperadmin.ts` — verifica `user_roles.role = 'superadmin'`, retorna `{ isSuperadmin, isLoading }`
- `src/components/auth/AdminRoute.tsx` — guarda de rota: aguarda load → se não for superadmin, `<Navigate to="/" />`
- `src/components/admin/AdminLayout.tsx` — layout próprio com sidebar dedicada (header simples "DispatchOne Admin", badge vermelha "Modo Admin", botão "Voltar ao app")
- `src/components/admin/AdminSidebar.tsx` — itens: Dashboard, Empresas, Usuários, Financeiro (collapsible com Transações/Recargas/Consumo), Preços, Provedores, Relatórios, Configurações
- `src/pages/admin/AdminDashboard.tsx` — 6 cards de métrica + gráfico (recharts já no projeto) + lista empresas recentes + alertas
- Roteamento em `src/App.tsx`: bloco `/admin/*` envolto em `<ProtectedRoute><AdminRoute><AdminLayout>`

### Edge Function de bootstrap
- `admin-bootstrap` (uma vez) — promove o primeiro usuário a superadmin se nenhum existir. Alternativa: instruir usuário a rodar SQL manual. **Vou usar SQL manual via insert** após a migration aplicar (pedir email).

## Fase 2 — Empresas e Usuários

- `src/pages/admin/AdminCompanies.tsx` — tabela com filtros (busca, status, saldo). Ações: ver, editar, adicionar saldo, ativar/desativar, excluir.
- `src/components/admin/CompanyDetailsDialog.tsx` — abas Informações / Owner / Membros / Financeiro / Uso.
- `src/components/admin/AddBalanceManualDialog.tsx` — valor + motivo (select) + observação.
- `src/pages/admin/AdminUsers.tsx` — lista profiles + memberships agregados; ações: tornar/remover superadmin, adicionar em empresa.
- `src/components/admin/UserDetailsDialog.tsx`.

### Edge Functions
- `admin-add-balance` — valida superadmin, credita wallet via RPC SECURITY DEFINER, cria `wallet_transactions` (type=adjustment), grava `admin_logs`.
- `admin-toggle-company` — ativa/desativa (adiciona coluna `is_active boolean DEFAULT true` em `companies`).
- `admin-set-superadmin` — INSERT/DELETE em `user_roles` com role superadmin, grava log.
- `admin-add-user-to-company` — reusa lógica de `company-add-member` mas sem precisar ser admin da empresa.

### RPC necessária
```sql
CREATE OR REPLACE FUNCTION public.wallet_credit_manual(
  _company_id uuid, _amount numeric, _reason text, _description text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER ...
-- valida is_superadmin(auth.uid()), atualiza wallet, insere transaction
```

## Fase 3 — Financeiro

- `src/pages/admin/AdminTransactions.tsx` — tabela paginada de `wallet_transactions` com filtros período/empresa/tipo/categoria + cards de resumo.
- `src/pages/admin/AdminRecharges.tsx` — `wallet_payments` com filtros + métricas (ticket médio, conversão).
- `src/pages/admin/AdminConsumption.tsx` — transações tipo `consumption` com breakdown por categoria (call/ura).
- Hook `useAdminTransactions`, `useAdminRecharges`, `useAdminConsumption` (React Query, paginação `.range()`).

## Fase 4 — Preços, Provedores, Relatórios, Configurações

- `src/pages/admin/AdminPricing.tsx` — duas seções: globais (linhas onde `company_id IS NULL`) e exceções por empresa. Modal editar.
- `src/pages/admin/AdminProviders.tsx` — formulários para credenciais (gravadas como secrets via tool em build mode; UI mostra status + botão "atualizar").
- `src/pages/admin/AdminReports.tsx` — lista de relatórios + export CSV (client-side via `papaparse` ou implementação manual).
- `src/pages/admin/AdminSettings.tsx` — CRUD `platform_settings` com seções (Recarga, Alertas, Limites, Manutenção).

### Wiring de preços
- `wallet-debit-ura` e `call-status` (consumo de ligação) passam a consultar `pricing_rules` (exceção por company → fallback global) em vez de constante hardcoded.

## Diagrama de rotas

```text
/                         → app cliente (atual)
/admin                    → AdminDashboard
/admin/empresas           → AdminCompanies
/admin/usuarios           → AdminUsers
/admin/financeiro/transacoes
/admin/financeiro/recargas
/admin/financeiro/consumo
/admin/precos
/admin/provedores
/admin/relatorios
/admin/configuracoes
```

Todas envoltas em `ProtectedRoute → AdminRoute → AdminLayout`.

## Detalhes técnicos

- **Auditoria**: toda mutação admin grava em `admin_logs` (admin_id, action, target_type, target_id, details com old/new value).
- **Sem subdomínio** `admin.dispatchone.com` na fase inicial — apenas `/admin` (subdomínio exigiria configuração de DNS/Lovable Cloud separada; pode ser feito depois sem refazer código).
- **Promoção do primeiro superadmin**: após a migration, executo um INSERT manual em `user_roles` para o email que você indicar (preciso saber qual conta é o superadmin inicial).
- **Sidebar do app cliente**: adiciono link discreto "🛡️ Painel Admin" no menu do usuário (`AppHeader` dropdown) visível apenas se `isSuperadmin`.
- **Charts**: usar `recharts` (já dependência do projeto pelos componentes existentes).
- **Maintenance mode**: `ProtectedRoute` lê `platform_settings.maintenance_mode`; se `true` e usuário não é superadmin, mostra tela de manutenção.

## Pergunta para você antes de começar

Qual email deve ser promovido a superadmin inicial? (necessário para o INSERT manual após a migration — sem isso ninguém consegue acessar `/admin`.)

Posso começar pela **Fase 1** (base + dashboard + proteção de rota) e seguir nas demais fases em mensagens subsequentes, ou prefere que eu entregue tudo de uma vez?
