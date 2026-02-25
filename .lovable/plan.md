

## Diagnóstico: Card do operador errado aparecendo

### Causa raiz

Todos os operadores criados pelo painel recebem o mesmo `user_id` (o ID do usuário admin logado). Quando o hook `useOperatorCall` busca o operador com:

```sql
SELECT * FROM call_operators
WHERE user_id = '<admin_id>' AND company_id = '...' AND is_active = true
ORDER BY status ASC
LIMIT 1
```

Ele retorna **qualquer um** dos operadores ativos do admin (o primeiro alfabeticamente por status). Se "Lorran" está com status "on_call" e "Estevão" está com "available", a ordenação alfabética coloca "available" antes de "on_call", então ele pega "Estevão" como operador mas o `current_call_id` pode estar em "Lorran" -- ou vice-versa. O resultado é exibir a chamada do operador errado.

### Solução proposta

Como todos os operadores compartilham o mesmo `user_id`, o CallPopup **não deve aparecer** quando o usuário tem múltiplos operadores ativos (pois ele é um gestor/admin, não um operador individual). O popup só faz sentido quando existe exatamente **um** operador vinculado àquele usuário.

### Alteração

**Arquivo:** `src/hooks/useOperatorCall.ts`

Na função `fetchOperator` (linhas 159-213), alterar a query para buscar **todos** os operadores do usuário (remover `.limit(1).maybeSingle()`), e só ativar o popup se houver exatamente um resultado:

```typescript
const fetchOperator = async () => {
  const { data, error } = await (supabase as any)
    .from("call_operators")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", activeCompanyId)
    .eq("is_active", true);

  if (error || !data || data.length === 0) {
    setOperator(null);
    setIsLoading(false);
    return;
  }

  // If user has multiple operators, they are an admin — don't show popup
  if (data.length > 1) {
    setOperator(null);
    setIsLoading(false);
    return;
  }

  const opData = data[0];
  // ... rest of existing logic with opData
};
```

### Resultado

- Usuário com **1 operador** ativo: CallPopup funciona normalmente, mostrando apenas suas chamadas
- Usuário com **2+ operadores** ativos (admin/gestor): CallPopup não aparece, evitando exibir chamadas de outros operadores
- Sem impacto no Painel de Ligações (tabela), que continua listando todas as chamadas de todas as campanhas

### Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Verificar quantidade de operadores antes de ativar o popup |

