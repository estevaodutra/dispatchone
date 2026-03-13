

## Adicionar menu "..." para remover leads da fila — incluindo os em ligação

### Problema
Na aba Fila, itens com status `in_call` não mostram o botão "..." porque a condição na linha 1165 exclui explicitamente `qe.status !== "in_call"`. Isso impede que o operador/admin remova um lead que está em ligação diretamente da fila.

### Solução

**Arquivo: `src/pages/CallPanel.tsx`**

Alterar a condição na linha 1165 para sempre mostrar o menu "..." para itens da `call_queue` (não call_log), removendo a condição `qe.status !== "in_call"`:

```tsx
// ANTES:
{!isFromCallLog && qe.status !== "in_call" && (

// DEPOIS:
{!isFromCallLog && (
```

Para itens `in_call`, o menu "..." mostrará apenas a opção "Remover" (sem "Para o início" / "Para o final", que não fazem sentido para chamadas ativas). A ação de remover para itens `in_call` usará `cancelCall` (que já lida com `answered`/`in_progress`) em vez de `removeFromQueue`, garantindo que o `call_log` seja marcado como cancelado e o operador liberado.

Lógica no menu:
- Se `qe.status !== "in_call"`: mostra as 3 opções (início, final, remover via `removeFromQueue`)
- Se `qe.status === "in_call"`: mostra apenas "Remover da fila" que abre o dialog de cancelamento (`setCancelEntry`) mapeando o queue item para um `CallPanelEntry` compatível usando o `call_log_id`

### Arquivo alterado
1. **`src/pages/CallPanel.tsx`** — remover condição `in_call`, adicionar lógica condicional no menu dropdown

