

## Plano: Substituir QueueCard por tabela + adicionar "Para o início"

### Resumo
Trocar a listagem de cards na aba "Fila" por uma tabela no mesmo padrão das outras abas, com colunas de posição, lead, telefone, campanha, tentativas e ações. As ações serão: "Para o início", "Para o final" e "Remover", acessíveis via dropdown menu.

### Alterações

**1. `src/hooks/useCallQueuePanel.ts`** — Adicionar mutation `sendToStartOfQueue`
- Para status "waiting": setar `position = 0` (ou menor que o mínimo atual) no `call_queue`
- Para status "ready": setar `scheduled_for` para um timestamp no passado distante para que fique primeiro na ordenação
- Expor `sendToStartOfQueue` no retorno do hook

**2. `src/pages/CallPanel.tsx`** — Substituir cards por tabela
- Remover o componente `QueueCard` inteiro
- Substituir o bloco de renderização da aba "Fila" (linhas 1028-1041) por uma `<Table>` com colunas:
  - **#** (posição)
  - **Lead** (nome)
  - **Telefone**
  - **Campanha**
  - **Tentativas**
  - **Último resultado**
  - **Ações** (dropdown com: Para o início, Para o final, Remover)
- Manter o `QueueStatusBanner` acima da tabela
- Importar `ChevronsUp` do lucide-react e adicionar ao import existente
- Destructure `sendToStartOfQueue` do hook `useCallQueuePanel`
- Adicionar import de `ArrowUpToLine` ou usar `ChevronsUp` para o ícone "Para o início"

### Detalhes técnicos

```text
┌──────┬────────────┬─────────────┬───────────────┬──────────┬──────────────┬────────┐
│  #   │   Lead     │  Telefone   │  Campanha     │ Tentativa│ Últ. Result. │ Ações  │
├──────┼────────────┼─────────────┼───────────────┼──────────┼──────────────┼────────┤
│ 9000 │ Alvaro     │ +55 (21)... │ Abandono...   │   0      │     —        │  ...   │
└──────┴────────────┴─────────────┴───────────────┴──────────┴──────────────┴────────┘
```

O dropdown de ações terá:
- ⬆ Para o início
- ⬇ Para o final
- ─ (separador)
- 🗑 Remover (em vermelho)

