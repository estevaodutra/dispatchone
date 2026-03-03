

## Problema

O nome exibido na sidebar ("Estevão Dutra") vem da coluna `companies.name` no banco de dados, que foi preenchida com o nome do usuário ao invés do nome da empresa. A página de Configurações tem um campo "Nome da Empresa" mas o `handleSaveChanges` **não salva de verdade** — apenas simula com um `setTimeout`.

## Correção

### 1. Atualizar `companies.name` no banco de dados
- Atualizar o registro da empresa do usuário para "D2X Negócios Digitais" diretamente no banco

### 2. Corrigir `handleSaveChanges` em `src/pages/Settings.tsx`
- Substituir o `setTimeout` fake por uma query real que atualiza `companies.name` usando o `activeCompanyId` do `CompanyContext`
- Após salvar, chamar `refetch()` do `CompanyContext` para atualizar a sidebar

### 3. Carregar o nome atual da empresa ao abrir Settings
- Adicionar `useEffect` que inicializa `settings.companyName` com `activeCompany.name` do contexto

### Detalhes técnicos

**`src/pages/Settings.tsx`**:
- Importar `useCompany` e usar `activeCompany`, `activeCompanyId`, `refetch`
- No `useEffect` inicial: `setSettings(prev => ({ ...prev, companyName: activeCompany?.name || "" }))`
- No `handleSaveChanges`: executar `supabase.from("companies").update({ name: settings.companyName }).eq("id", activeCompanyId)` e depois `refetch()`

