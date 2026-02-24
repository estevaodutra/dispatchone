

## Diagnóstico: Pop-up não aparece

### Causa raiz identificada

O usuário `estevaodutra.pmss@gmail.com` (ID `3b6be6fe...`) possui **dois operadores ativos** vinculados ao mesmo `user_id`:

| Operador | Status | is_active |
|----------|--------|-----------|
| Estevão Dutra | available | true |
| Lorran | offline | true |

O hook `useOperatorCall` faz a consulta:
```typescript
.eq("user_id", user.id)
.eq("company_id", activeCompanyId)
.eq("is_active", true)
.maybeSingle()
```

O `.maybeSingle()` retorna **erro** quando encontra mais de uma linha, fazendo `data` ser `null`. Com isso, `operator` fica `null` e o `CallPopup` retorna `null` (linha `if (isLoading || !operator) return null`).

### Correção

**Arquivo: `src/hooks/useOperatorCall.ts`**

Trocar `.maybeSingle()` por `.order("created_at", { ascending: true }).limit(1).maybeSingle()` para selecionar sempre o operador mais antigo (o "principal"), evitando o erro de múltiplas linhas.

Alternativa mais robusta: usar `.limit(1).single()` com ordenação por status (priorizar `available` ou `on_call` sobre `offline`):

```typescript
const { data, error } = await (supabase as any)
  .from("call_operators")
  .select("*")
  .eq("user_id", user.id)
  .eq("company_id", activeCompanyId)
  .eq("is_active", true)
  .order("status", { ascending: true }) // available < offline alphabetically
  .limit(1)
  .maybeSingle();
```

Isso garante que mesmo com múltiplos operadores vinculados ao mesmo usuário, o popup sempre seleciona um e renderiza corretamente.

### Impacto
- Arquivo único: `src/hooks/useOperatorCall.ts`
- Linha ~122: alterar a query de fetch do operador
- Sem alteração no banco de dados

