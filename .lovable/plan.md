

# Fix: Toggle de disponibilidade - RLS Policy

## Diagnostico

O codigo no `OperatorsPanel.tsx` ja esta correto com `try/catch`, `await` e invalidacao de cache. O problema real e a **RLS policy** na tabela `call_operators`: a policy de UPDATE so permite `is_company_admin()`. Operadores nao-admin nao conseguem atualizar seu proprio status.

## Solucao

Adicionar uma migration SQL que permita operadores atualizarem seu proprio registro (onde `user_id = auth.uid()`), mantendo a restricao de admin para atualizar operadores de outros usuarios.

### Migration SQL

```sql
DROP POLICY IF EXISTS "Admins can update company operators" ON call_operators;

CREATE POLICY "Members can update own or admin can update any"
  ON call_operators
  FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR
    ((company_id IS NOT NULL) AND is_company_admin(company_id, auth.uid()))
    OR
    ((company_id IS NULL) AND (user_id = auth.uid()))
  );
```

Isso permite que:
- Qualquer usuario atualize seu **proprio** registro de operador (`user_id = auth.uid()`)
- Admins da empresa atualizem **qualquer** operador da empresa

### Arquivos alterados

| Tipo | Descricao |
|------|-----------|
| Migration SQL | Atualizar RLS policy de UPDATE em `call_operators` para permitir self-update |

Nenhuma alteracao de codigo frontend e necessaria - o codigo ja esta correto.

