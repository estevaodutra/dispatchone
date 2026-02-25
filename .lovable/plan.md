

## Diagnóstico

Na linha 729 de `CallPanel.tsx`, o filtro de elegibilidade para o botão "Discar" só aceita `["scheduled", "ready"]`:

```typescript
const toEnqueue = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready"].includes(e.callStatus));
```

Chamadas com status `cancelled` são excluídas, gerando a mensagem "Nenhuma ligação elegível".

## Solução

Adicionar `"cancelled"` e `"failed"` à lista de status elegíveis para discagem em massa, permitindo que o operador redisque leads cancelados ou que falharam.

**Arquivo:** `src/pages/CallPanel.tsx` (linha 729)

Trocar:
```typescript
["scheduled", "ready"].includes(e.callStatus)
```

Por:
```typescript
["scheduled", "ready", "cancelled", "failed"].includes(e.callStatus)
```

Atualizar também a mensagem de erro (linha 731) para refletir os novos status aceitos.

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/CallPanel.tsx` | Incluir `cancelled` e `failed` como status elegíveis para discagem em massa |

