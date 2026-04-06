

## Plano: Fazer "Atualizar Status" consultar o status real da instância

### Problema
O botão "Atualizar Status" apenas faz `refetch()` do banco de dados local, sem fazer nenhuma requisição externa ao provedor (Z-API) para verificar o status real da instância. O status no banco nunca muda, então o botão não tem efeito prático.

### Solução
Ao clicar em "Atualizar Status", para cada instância que tenha credenciais configuradas (`idInstance` + `tokenInstance`), enviar uma requisição via `zapi-proxy` para buscar o status real e atualizar o banco.

### Alterações

#### 1. `src/pages/Instances.tsx` — `handleRefreshStatus`

Substituir a função atual que só faz `refetch()` por uma que:

1. Itera sobre cada instância com credenciais configuradas
2. Chama `zapi-proxy` com endpoint `/status` (ou equivalente do provedor) para obter o status real
3. Se o status retornado diferir do banco, atualiza via `updateInstance`
4. Ao final, faz `refetch()` e exibe toast

```typescript
const handleRefreshStatus = async () => {
  setIsRefreshing(true);
  try {
    for (const instance of instances) {
      if (!instance.idInstance || !instance.tokenInstance) continue;
      
      try {
        const { data } = await supabase.functions.invoke("zapi-proxy", {
          body: {
            instanceId: instance.id,
            endpoint: "/status",
            method: "GET",
          },
        });
        
        // Map Z-API status to our status
        const connected = data?.connected === true;
        const newStatus = connected ? "connected" : "disconnected";
        const currentDbStatus = mapFrontendStatusToDb(instance.status);
        
        if (newStatus !== currentDbStatus) {
          await updateInstance({
            id: instance.id,
            updates: { status: newStatus },
          });
        }
      } catch (err) {
        console.warn(`Failed to refresh status for ${instance.name}:`, err);
      }
    }
    
    await refetch();
    toast({ title: t("instances.statusRefreshed"), description: t("instances.statusRefreshed") });
  } finally {
    setIsRefreshing(false);
  }
};
```

### Arquivos
- `src/pages/Instances.tsx`

