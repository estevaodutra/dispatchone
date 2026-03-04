

## Melhorar sidebar no modo collapsed (icon-only)

### Problema
No modo collapsed, os ícones ficam apertados e sem espaçamento adequado. O header mantém padding excessivo, os itens de menu têm `gap-3` e `px-3` que não se ajustam ao modo icon, e os dois grupos de navegação (principal + sistema) têm um `mt-6` que cria espaço demais entre seções. O separador visual entre os grupos fica ausente.

### Alterações em `src/components/layout/AppSidebar.tsx`

1. **Header** (linha 101): Ajustar padding condicional — `px-2 py-3` quando collapsed, `px-4 py-3` quando expandido. Centralizar o ícone Zap no modo collapsed.

2. **SidebarContent** (linha 144): Reduzir padding lateral quando collapsed — `px-1` ao invés de `px-2`.

3. **Items de menu** (linhas 154-156, 274-276): Os NavLinks já usam `px-3 py-2 gap-3`. Quando collapsed, ajustar para `justify-center px-0` para centralizar o ícone.

4. **Separador entre grupos** (linha 266): Trocar `mt-6` por um `Separator` visual + espaçamento menor (`mt-2 pt-2`) com uma linha sutil entre os dois grupos para organizar melhor.

5. **Campanhas no collapsed** (linhas 174-195): Quando collapsed, o botão de campanhas deve funcionar como os outros (só ícone centralizado), e ao clicar mostrar um dropdown/popover com os subitens ao invés do collapsible inline.

