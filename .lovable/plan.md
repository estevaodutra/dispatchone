
# Corrigir Atribuicao de Operador Offline

## Problema

O operador "Mauro" esta com `is_active = true` mas `status = offline`, e mesmo assim recebe ligacoes. Isso acontece porque dois dos tres pontos de atribuicao de operador nao verificam o campo `status` -- apenas o `is_active`.

## Pontos Afetados

### 1. Edge Function `call-dial/index.ts` (linhas 430-478)
Busca operadores filtrando apenas `is_active = true`, sem verificar se o `status` e `available`. Qualquer operador ativo (mesmo offline ou em cooldown) pode ser selecionado.

**Correcao:** Adicionar filtro `.eq('status', 'available')` na query de busca de operadores (linha 434). Se nenhum operador estiver disponivel, retornar erro `no_operator_available`.

### 2. Hook `useCallPanel.ts` - `dialNowMutation` (linhas 258-306)
A logica de redirecionamento so e ativada quando `is_active === false`. Se o operador original esta `is_active = true` mas `status = offline`, a verificacao passa direto e a ligacao e atribuida a ele.

**Correcao:** Alterar a condicao na linha 265 de:
```
const isInactive = !currentOp || currentOp.is_active === false;
```
Para:
```
const isInactive = !currentOp || currentOp.is_active === false || currentOp.status !== 'available';
```

E tambem na busca de operadores alternativos (linha 269-273), adicionar filtro de `status = available` alem de `is_active = true`.

### 3. `queue-executor/index.ts` -- sem alteracao
Este ja funciona corretamente, verificando `status === 'available'` na linha 202.

## Alteracoes Detalhadas

### `supabase/functions/call-dial/index.ts`

**Linha 434:** Adicionar filtro de status
```typescript
// De:
.eq('is_active', true)
.order('created_at', { ascending: true });

// Para:
.eq('is_active', true)
.eq('status', 'available')
.order('created_at', { ascending: true });
```

### `src/hooks/useCallPanel.ts`

**Linha 261:** Adicionar `status` ao select
```typescript
// De:
.select("id, operator_name, extension, is_active")

// Para:
.select("id, operator_name, extension, is_active, status")
```

**Linha 265:** Verificar tambem o status
```typescript
// De:
const isInactive = !currentOp || currentOp.is_active === false;

// Para:
const isInactive = !currentOp || currentOp.is_active === false || currentOp.status !== 'available';
```

**Linhas 269-273:** Filtrar operadores substitutos pelo status
```typescript
// De:
.eq("is_active", true)
.order("created_at", { ascending: true });

// Para:
.eq("is_active", true)
.eq("status", "available")
.order("created_at", { ascending: true });
```

## Resultado

Apos as correcoes, os tres pontos de atribuicao terao comportamento consistente: so atribuem ligacoes a operadores que estejam simultaneamente `is_active = true` E `status = available`.
