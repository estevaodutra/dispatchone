

## Plano: Adicionar opção de renomear lead no CallActionDialog

### O que fazer

Adicionar um botão de edição (ícone lápis) ao lado do nome do lead no header do `CallActionDialog.tsx`. Ao clicar, o nome vira um `Input` editável. Ao confirmar (Enter ou blur), atualiza o nome em `call_leads` e no estado local.

### Alterações

**`src/components/operator/CallActionDialog.tsx`**:

1. Adicionar estado `isEditingName` + `editName`
2. No `<h2>` do nome do lead (linha 371-373), alternar entre texto estático e `<Input>` editável
3. Adicionar ícone `Pencil` (lucide) ao lado do nome
4. Na confirmação, fazer `supabase.from("call_leads").update({ name: editName }).eq("id", currentData.leadId)` e atualizar `currentData.leadName`
5. Importar `Pencil` do lucide-react

Nenhuma migration necessária. O campo `name` já existe em `call_leads`.

