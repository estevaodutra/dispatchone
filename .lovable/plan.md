
# Sistema de Acesso por Empresa

Bloquear novos usuários até serem adicionados a uma empresa por um admin. O backend de membership (`companies`, `company_members`, `is_company_member`, `is_company_admin`) já existe — o trabalho aqui é **remover a auto-criação de empresa no signup**, adicionar a tela de espera, proteger o roteamento, e expor uma UI mínima de gestão de membros.

A Fase 4 (papéis granulares manager/viewer) **não** será incluída agora — hoje só existem `admin` e `operator`. Mantemos esse escopo e listo isso como follow-up.

---

## Fase 1 — Bloqueio Básico (foco principal)

### 1.1 Migration: parar de criar empresa automaticamente

Hoje o trigger `handle_new_user` (em `20260224125722...sql`) cria uma `company` + `company_members` (admin) para todo novo signup. Isso quebra a regra "usuário novo não pode acessar nada".

Nova migration:

- `CREATE OR REPLACE FUNCTION public.handle_new_user()` que **só** insere em `profiles` e `user_roles`. Remove os `INSERT` em `companies` / `company_members`.
- Mantém `SECURITY DEFINER` e `SET search_path = public`.
- Remove a policy `Authenticated can insert companies` da tabela `companies` (ou troca para exigir `service_role`), para garantir que um usuário recém-criado **não** consiga criar a própria company pelo client. Criação de empresa fica restrita a admin/seed via SQL.
- Não mexe no trigger `trg_companies_create_owner_operator` (esse continua válido quando um admin criar uma company manualmente).
- Não toca em `is_company_member` / `is_company_admin` (já existem como SECURITY DEFINER).

> Nota: o schema atual usa `company_members.is_active boolean` (não `status text`). Vamos seguir o schema existente — todo o código novo filtra por `is_active = true`. Não vamos adicionar colunas `status / invited_by / invited_at / accepted_at` agora para evitar refactor amplo das policies já em produção.

### 1.2 Hook `useCompanyAccess`

`CompanyContext` já carrega `companies` para o user logado. Vamos derivar dele:

- `hasCompanyAccess = !isLoading && companies.length > 0`
- Exposto via `useCompany()` (já existente) ou um helper `useCompanyAccess()` fino em cima dele.

Sem nova chamada de rede — reaproveita o fetch que já roda no `CompanyProvider`.

### 1.3 Tela `/aguardando-acesso`

Novo arquivo `src/pages/AwaitingAccess.tsx`:

- Layout centralizado, sem sidebar/header (renderizado fora do `AppLayout`).
- Logo + ícone de cadeado/relógio (`lucide-react` `Clock` ou `Lock`).
- Título "Aguardando acesso".
- Mensagem explicando que precisa ser adicionado por um admin.
- Mostra `user.email`.
- Botão **Verificar novamente** → chama `refetch()` do `CompanyContext` (não recarrega a página).
- Botão **Sair** → `signOut()` do `AuthContext` e navega para `/auth`.
- Usa `Card`, `Button` shadcn já no projeto. Sem novas dependências.

### 1.4 Proteção de rotas

Atualizar `src/components/auth/ProtectedRoute.tsx`:

- Mantém o check de `user`.
- Adiciona check de `useCompany()`: se não está carregando e `companies.length === 0`, faz `<Navigate to="/aguardando-acesso" replace />`.
- Aceita prop opcional `requireCompany={false}` para a própria rota `/aguardando-acesso` não ficar em loop.

Atualizar `src/App.tsx`:

- Importar `AwaitingAccess` e registrar `<Route path="/aguardando-acesso" element={<ProtectedRoute requireCompany={false}><AwaitingAccess /></ProtectedRoute>} />`.
- Demais rotas continuam como estão (todas já passam por `ProtectedRoute` + `AppLayout`).

Atualizar `src/pages/Auth.tsx`:

- No `useEffect` de pós-login, se `user` existir mas `companies.length === 0` (após `CompanyContext` carregar), redirecionar para `/aguardando-acesso` em vez de `/`.

---

## Fase 2 — Gerenciamento de Membros

Há um edge function pronto: `supabase/functions/company-add-member/index.ts` que valida se o caller é admin, busca user por email em `profiles`, e cria `company_members` (+ `call_operators` se role=operator). Vamos consumi-lo.

### 2.1 Página `/configuracoes/membros`

Nova rota e nova página `src/pages/settings/MembersPage.tsx`:

- Acessível apenas se `useCompany().isAdmin === true`. Caso contrário, mostra mensagem "Apenas administradores podem gerenciar membros".
- Tabela de membros atuais da `activeCompany`: avatar (placeholder), nome (`profiles.full_name`), email (`profiles.email`), badge de role (`admin`/`operator`), data de entrada (`joined_at`), ação **Remover**.
- Seção "Adicionar membro": input email, select role (`admin` | `operator`), input opcional `extension`, botão **Adicionar** → chama `supabase.functions.invoke('company-add-member', { body: { company_id, email, role, extension } })`.
- Toast com erros conhecidos: `not_admin`, `user_not_found`, `already_member`.
- **Remover**: `delete` em `company_members` filtrando `company_id` + `user_id` (a policy `Admins can delete members` já cobre).

### 2.2 Sidebar

Em `AppSidebar.tsx`, adicionar item "Membros" dentro do grupo de Configurações (ou no topo de Settings) — visível apenas se `isAdmin`. Link para `/configuracoes/membros`.

---

## Fase 3 — Múltiplas Empresas (mínimo)

`CompanyContext` já guarda `activeCompanyId` no `localStorage` e expõe `setActiveCompany(id)`. Falta apenas a UI:

- Em `src/components/layout/AppHeader.tsx`, adicionar um `Select` (shadcn) populado com `companies` do `useCompany()`.
- Esconder se `companies.length <= 1`.
- `onValueChange` chama `setActiveCompany(id)`. Não é necessário `window.location.reload()` — os hooks que dependem de `activeCompanyId` já reagem ao contexto.

---

## Fase 4 — Papéis Granulares (NÃO incluído nesta entrega)

`manager` e `viewer` exigiriam:
- Migração para expandir os valores aceitos em `company_members.role`.
- Refactor das policies que hoje fazem `is_company_admin(company_id, user.id)` → precisariam virar checks por role específica.
- Revisão da matriz de permissões em todas as ~30 tabelas.

Listo isso como **follow-up**, não como parte deste plano. Hoje continuamos só com `admin` e `operator`.

---

## Detalhes técnicos

### Arquivos a criar

```
supabase/migrations/{timestamp}_disable_auto_company_signup.sql
src/pages/AwaitingAccess.tsx
src/pages/settings/MembersPage.tsx
src/hooks/useCompanyMembers.ts        (lista + remove membros via supabase client)
```

### Arquivos a editar

```
src/components/auth/ProtectedRoute.tsx   — checa membership
src/App.tsx                              — registra /aguardando-acesso e /configuracoes/membros
src/pages/Auth.tsx                       — pós-login decide entre / e /aguardando-acesso
src/components/layout/AppSidebar.tsx     — item "Membros" (admins)
src/components/layout/AppHeader.tsx      — seletor de empresa quando >1
src/contexts/CompanyContext.tsx          — (opcional) expor helper hasAccess
```

### SQL da nova migration (resumo)

```sql
-- handle_new_user: SEM criar company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- impede client de criar company por conta própria
DROP POLICY IF EXISTS "Authenticated can insert companies" ON public.companies;
```

> Os usuários **já existentes** continuam com suas companies (não removemos nada). Só novos signups passam a cair na tela de espera.

### RLS / segurança

- `company_members` já tem `Admins can insert members` usando `is_company_admin(...)`. Combinada com a edge function (que usa service role e checa caller admin), a Fase 2 funciona.
- `companies`: ao remover a policy de INSERT, criação de novas empresas só será possível via SQL/admin (intencional). Se no futuro precisar permitir auto-cadastro de empresa para usuários verificados, criamos uma edge function dedicada com regras de negócio.

### Riscos / pontos de atenção

1. **Usuários existentes sem membership ativo** ficam bloqueados. Query atual mostra que todos os 4 usuários têm pelo menos 1 — seguro.
2. Após Fase 1, **não haverá fluxo self-service para o primeiro admin** de uma nova empresa. Para criar a primeira empresa de um cliente novo, será via SQL/console. Confirmar se é o esperado.
3. O `CompanyContext` faz fetch ao montar — durante esse loading, `ProtectedRoute` deve mostrar o spinner (não redirecionar prematuramente para `/aguardando-acesso`).

### Fora de escopo

- Convites por email para usuários ainda não cadastrados.
- Papéis `manager` / `viewer`.
- Coluna `current_company_id` em `profiles` (já temos `localStorage` no `CompanyContext`).
- Notificação ao admin quando alguém novo se cadastra (pode ser follow-up).
