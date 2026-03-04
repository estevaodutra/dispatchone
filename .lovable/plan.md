

## Corrigir: Cards de ligação de outro operador aparecendo na aba "Em Andamento"

### Diagnóstico

O Painel de Ligações (`CallPanel.tsx`) mostra **todas** as ligações em andamento da empresa, sem filtrar por operador. Quando Mauro abre a aba "Em Andamento", ele vê os cards das ligações do Estevão (e vice-versa). O `CallPopup` (card flutuante) filtra corretamente por `user_id`, mas a aba do painel não aplica esse filtro.

### Solução

**Arquivo: `src/pages/CallPanel.tsx`**

1. Detectar o operador do usuário atual usando os `operators` já carregados pelo `useCallOperators` + `user.id`:
   ```ts
   const myOperator = useMemo(() => {
     if (!user) return null;
     const mine = operators.filter(op => op.id && /* match user */);
     // Use isAdmin from CompanyContext
     return isAdmin ? null : operators.find(op => /* belongs to current user */);
   }, [operators, user, isAdmin]);
   ```

2. Problema: `useCallOperators` não expõe o `userId` de cada operador (o hook transforma os dados e omite `user_id`). Preciso verificar se o `user_id` está disponível.

Vou verificar a transformação no hook para confirmar.

**Abordagem ajustada:**

Como o `useCallOperators` não retorna `user_id`, e o `useOperatorCall` já identifica o operador do usuário (por `user_id`), a solução mais simples é:

1. Adicionar `userId` à interface `CallOperator` e ao `transformDbToFrontend` em `useCallOperators.ts`
2. No `CallPanel.tsx`, filtrar `inProgressEntries` quando o usuário é operador (não admin):
   - Encontrar o operador do user atual: `operators.find(op => op.userId === user.id)`
   - Se encontrou exatamente 1: filtrar `inProgressEntries` por `entry.operatorId === myOperator.id`
   - Se admin: mostrar todos (comportamento atual)

### Arquivos alterados

- **`src/hooks/useCallOperators.ts`**: Adicionar `userId` à interface `CallOperator` e ao mapeamento
- **`src/pages/CallPanel.tsx`**: Filtrar `inProgressEntries` pelo operador do usuário quando não é admin

