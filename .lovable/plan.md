

# Sistema de Companhias e Convite de Operadores

## Escopo Geral

Migrar o modelo de dados de isolamento por `user_id` para isolamento por `company_id`. O admin adiciona operadores buscando pelo email ja cadastrado no DispatchOne (sem envio de email automatico).

**Devido ao tamanho desta mudanca, o plano sera executado em fases.** Esta primeira fase foca na fundacao: criacao das tabelas, contexto de companhia, seletor lateral e fluxo de adicionar operador por email.

---

## Fase 1 (esta implementacao)

### 1. Novas Tabelas

**`companies`**
- `id` UUID PK
- `name` TEXT NOT NULL
- `owner_id` UUID NOT NULL (referencia auth.users)
- `created_at`, `updated_at` TIMESTAMPTZ

**`company_members`**
- `id` UUID PK
- `company_id` UUID FK -> companies
- `user_id` UUID FK -> auth.users (nao referencia diretamente, mesma abordagem das demais tabelas)
- `role` TEXT DEFAULT 'operator' (valores: 'admin', 'operator')
- `is_active` BOOLEAN DEFAULT true
- `joined_at` TIMESTAMPTZ DEFAULT now()
- UNIQUE(company_id, user_id)

**RLS:** Membros podem ver membros da mesma companhia. Admins podem inserir/remover membros.

**Trigger:** Ao criar usuario (handle_new_user), criar automaticamente uma companhia com o nome do perfil e inserir o usuario como admin.

### 2. Adicionar `company_id` na tabela `call_operators`

- Nova coluna `company_id UUID` na tabela `call_operators`
- Migrar operadores existentes: setar `company_id` baseado no `user_id` do dono
- Atualizar RLS para filtrar por company_id via funcao de membership

### 3. Contexto de Companhia (`CompanyContext`)

**Novo arquivo:** `src/contexts/CompanyContext.tsx`
- Provider que carrega as companhias do usuario logado (via `company_members`)
- Estado: `activeCompanyId`, `companies`, `setActiveCompany`
- Persiste companhia ativa no `localStorage`
- Expoe hook `useCompany()` usado por todos os hooks de dados

### 4. Seletor de Companhias na Sidebar

**Alterar:** `src/components/layout/AppSidebar.tsx`
- Adicionar dropdown no header da sidebar mostrando companhia ativa
- Lista de companhias do usuario com indicador da ativa
- Clicar troca a companhia ativa via `useCompany().setActiveCompany`

```text
┌─────────────────────┐
│ ⚡ DispatchOne       │
├─────────────────────┤
│ 🏢 FN | Lorran  ▼  │  <- dropdown
│                     │
│  ● FN | Lorran      │
│  ○ IPTV             │
│  ○ Suporte D²X      │
└─────────────────────┘
```

### 5. Atualizar OperatorsPanel

**Alterar:** `src/components/call-panel/OperatorsPanel.tsx`
- Botao muda de "Novo Operador" para "Adicionar Operador"
- Nova dialog: busca por email cadastrado no DispatchOne
- Se encontrar o usuario, adiciona como `company_member` (role: operator) e cria `call_operator` vinculado a companhia
- Se nao encontrar, mostra mensagem "Usuario nao encontrado. O operador precisa criar uma conta primeiro."
- Sub-abas: "Ativos" e "Pendentes" (pendentes = membros sem operador configurado)

**Nova dialog:** `src/components/call-panel/AddOperatorDialog.tsx`
```text
┌──────────────────────────────────────────┐
│ Adicionar Operador                   [X] │
├──────────────────────────────────────────┤
│                                          │
│ Busque pelo email do operador.           │
│ Ele precisa ter uma conta no DispatchOne.│
│                                          │
│ Email *                                  │
│ ┌──────────────────────────────────────┐ │
│ │ operador@email.com                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Funcao                                   │
│  ○ Operador                              │
│  ○ Administrador                         │
│                                          │
│ Ramal (opcional)                         │
│ ┌──────────────────────────────────────┐ │
│ │ 1003                                 │ │
│ └──────────────────────────────────────┘ │
│                                          │
├──────────────────────────────────────────┤
│              [Cancelar] [Adicionar]      │
└──────────────────────────────────────────┘
```

### 6. Edge Function: `company-add-member`

Necessaria porque precisamos buscar na tabela `profiles` por email (que pode pertencer a outro usuario) e depois inserir em `company_members` -- operacao que requer `service_role`.

- Recebe: `{ email, role, extension?, company_id }`
- Valida que o caller e admin da companhia
- Busca profile pelo email
- Se nao encontrar: retorna erro
- Se ja e membro: retorna erro
- Cria `company_member` e `call_operator` (se role = operator)
- Retorna dados do novo membro

### 7. Atualizar `useCallOperators`

- Filtrar por `company_id` da companhia ativa (via `useCompany()`)
- Inserir `company_id` ao criar operador

### 8. Atualizar RLS e funcoes SQL

- Nova funcao `is_company_member(company_id, user_id)` SECURITY DEFINER
- Nova funcao `is_company_admin(company_id, user_id)` SECURITY DEFINER
- RLS de `call_operators`: permitir SELECT para membros da mesma companhia
- RLS de `company_members`: membros podem ver membros da mesma companhia; admins podem INSERT/DELETE

### 9. Migrar `handle_new_user` trigger

Atualizar para tambem:
1. Criar uma companhia com `name = full_name || email`
2. Inserir o usuario como admin da companhia

---

## Fase 2 (futura)

- Migrar `company_id` para: `call_campaigns`, `call_logs`, `call_queue`, `leads`, `campaigns`, etc.
- Atualizar todas as RLS policies
- Atualizar todos os hooks para filtrar por `activeCompanyId`
- Remover operador da companhia (soft delete via is_active)

---

## Arquivos Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/contexts/CompanyContext.tsx` | Provider + hook useCompany |
| `src/components/call-panel/AddOperatorDialog.tsx` | Dialog para adicionar operador por email |
| `supabase/functions/company-add-member/index.ts` | Edge function para adicionar membro |

## Arquivos Alterados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Seletor de companhia no header |
| `src/components/call-panel/OperatorsPanel.tsx` | Botao "Adicionar Operador", sub-abas |
| `src/hooks/useCallOperators.ts` | Filtrar por company_id |
| `src/App.tsx` | Wrapping com CompanyProvider |
| `src/contexts/AuthContext.tsx` | Nenhuma mudanca |

## Migracoes SQL

1. Criar tabelas `companies` e `company_members` com RLS
2. Criar funcoes `is_company_member` e `is_company_admin`
3. Adicionar coluna `company_id` em `call_operators`
4. Atualizar `handle_new_user` para criar companhia automaticamente
5. Migrar operadores existentes (UPDATE call_operators SET company_id = ...)

