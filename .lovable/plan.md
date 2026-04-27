## Plano: Botão "Copiar ID" em todas as campanhas

### O que será adicionado

Novo item **"Copiar ID"** (com ícone `Copy`) no menu de três pontos (`...`) de cada card de campanha, em todas as 4 listagens. Ao clicar, copia o UUID da campanha para a área de transferência e mostra um toast de confirmação com o ID copiado.

### Arquivos afetados

1. **`src/components/call-campaigns/CallCampaignList.tsx`** — adicionar `DropdownMenuItem` "Copiar ID" logo após "Configurar" (ícone `Copy` já está importado; importar `toast` de `sonner`).

2. **`src/components/group-campaigns/GroupCampaignList.tsx`** — mesmo item após "Configurar"; importar `Copy` de `lucide-react` e `toast` de `sonner`.

3. **`src/components/dispatch-campaigns/DispatchCampaignList.tsx`** — mesmo item após "Configurar"; importar `Copy` e `toast`.

4. **`src/components/pirate-campaigns/PirateCampaignList.tsx`** — mesmo item após "Configurar"; importar `Copy` e `toast`.

### Implementação

Para cada item:

```tsx
<DropdownMenuItem onClick={(e) => {
  e.stopPropagation();
  navigator.clipboard.writeText(campaign.id);
  toast.success("ID copiado", { description: campaign.id });
}}>
  <Copy className="mr-2 h-4 w-4" />
  Copiar ID
</DropdownMenuItem>
```

### Comportamento final

- Em qualquer listagem de campanha (Ligação, Grupo, Despacho, Pirata), o usuário abre o menu `...` do card → clica **"Copiar ID"** → o UUID vai para o clipboard → toast confirma com o ID visível.

### Fora do escopo

- Botão de copiar ID dentro das telas de detalhes (pode ser adicionado depois se útil)
- Copiar outros campos (nome, instância, etc.)
