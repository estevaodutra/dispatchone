
# Exibir Status de Execucao em Fila no Painel de Ligacoes

## Objetivo

Atualmente, o banner de status da execucao em fila (campanhas rodando, pausadas, etc.) so aparece quando o operador abre a aba "Fila". O objetivo e tornar esse status visivel tambem na aba principal "Ligacoes", para que os gestores vejam imediatamente se ha campanhas em execucao automatica.

## O que muda

### Arquivo: `src/pages/CallPanel.tsx`

1. **Mover o `QueueStatusBanner` para fora da aba "Fila"** -- exibi-lo logo acima dos filtros/status tabs, dentro da aba "Ligacoes", mas **tambem** manter na aba "Fila".

2. Na pratica, o banner sera renderizado **logo apos os cards de metricas** (Agendadas, Em Andamento, Atendidas, Canceladas/Falhas) e **antes** da area de filtros, na aba "Ligacoes". Isso garante visibilidade imediata.

3. O banner so aparecera quando houver pelo menos uma campanha com estado ativo (running, paused, waiting_operator, waiting_cooldown) -- o mesmo comportamento atual.

### Resultado visual

O layout da aba "Ligacoes" ficara assim:

```text
+------------------------------------------+
| Metricas (Agendadas, Em Andamento, ...)  |
+------------------------------------------+
| [Banner] Em execucao - 1 executando      |
|   1 disponivel  | Pausar | Buscar ops    |
+------------------------------------------+
| Filtros + Status tabs                    |
+------------------------------------------+
| Tabela de ligacoes                       |
+------------------------------------------+
```

## Detalhes Tecnicos

- No componente `CallPanel`, dentro do `TabsContent value="calls"`, adicionar `<QueueStatusBanner ... />` entre o grid de metricas e a div de filtros (entre as linhas ~667 e ~669).
- Reutilizar exatamente as mesmas props ja passadas na aba "Fila" (`queueSummary`, `operators`, `handleRefreshQueue`, etc.).
- Nenhum componente novo sera criado -- e apenas uma linha adicional de JSX.
- Nenhuma alteracao de banco de dados necessaria.
