

## Plano: Adaptar parsing da resposta do webhook ao formato real

### Problema
O código atual espera que o webhook retorne objetos com `id` (nosso UUID interno) e `status` (string). Porém, o webhook retorna um formato diferente:
- `id` = ID externo da Z-API (ex: `3F0565CB...`), não nosso UUID
- `connected` = booleano (`true`/`false`), não string de status
- Inclui `paymentStatus` e `due` (timestamp de expiração)

### Alteração

**`src/pages/Instances.tsx`** — bloco de parsing da resposta (linhas 454-467):

1. Fazer match pelo campo `id` da resposta com `idInstance` (external_instance_id) da instância local, em vez de comparar com nosso UUID
2. Mapear `connected: true/false` → `"connected"/"disconnected"`
3. Aproveitar `paymentStatus` e `due` para atualizar `payment_status` e `expiration_date` no banco

```typescript
for (const result of results) {
  if (!result.id) continue;
  
  // Match by external instance ID, not our internal UUID
  const instance = instances.find(i => i.idInstance === result.id);
  if (!instance) continue;
  
  const newDbStatus = result.connected ? "connected" : "disconnected";
  const currentDbStatus = mapFrontendStatusToDb(instance.status);
  
  const updates: Record<string, any> = {};
  
  if (newDbStatus !== currentDbStatus) {
    updates.status = newDbStatus;
  }
  if (result.paymentStatus) {
    updates.payment_status = result.paymentStatus;
  }
  if (result.due) {
    updates.expiration_date = new Date(result.due).toISOString();
  }
  
  if (Object.keys(updates).length > 0) {
    await updateInstance({ id: instance.id, updates });
  }
}
```

### Arquivos
- `src/pages/Instances.tsx`

