

## Diagnóstico

O lápis foi adicionado apenas no `CallActionDialog.tsx` (componente do operador), mas o dialog que aparece no screenshot é o `ActionDialog` dentro de `src/pages/CallPanel.tsx` (linha ~1641). São dois componentes diferentes. O `ActionDialog` do CallPanel não recebeu a edição.

## Correção

**`src/pages/CallPanel.tsx`** — No `ActionDialog`, na linha 1641-1643:

1. Adicionar estados `isEditingName` + `editName`
2. Substituir o `<h2>` estático do nome pelo mesmo padrão de toggle (texto + ícone lápis ↔ Input editável)
3. Na confirmação, atualizar `call_leads.name` via Supabase e o estado local do `entry`
4. Importar `Pencil` do lucide-react

Mesma lógica já implementada no `CallActionDialog.tsx`, aplicada agora ao dialog correto.

