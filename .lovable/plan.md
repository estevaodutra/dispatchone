

## Plano: Usar webhook externo para atualizar status das instâncias

### Problema
A função `handleRefreshStatus` chama `zapi-proxy` que requer `Client-Token` não configurado. O usuário quer usar um webhook n8n dedicado.

### Solução
Substituir a chamada `zapi-proxy` por uma chamada ao `webhook-proxy` (já existente no projeto), enviando a lista de instâncias para o webhook `https://n8n-n8n.nuwfic.easypanel.host/webhook/status_instances` e aguardando a resposta com os status atualizados.

### Alteração

**`src/pages/Instances.tsx`** — função `handleRefreshStatus` (linhas 422-460):

Substituir o loop que chama `zapi-proxy` por uma única chamada via `webhook-proxy`:

```typescript
const handleRefreshStatus = async () => {
  setIsRefreshing(true);
  try {
    // Prepare payload with all instances that have credentials
    const instancesPayload = instances
      .filter(i => i.idInstance && i.tokenInstance)
      .map(i => ({
        id: i.id,
        name: i.name,
        external_instance_id: i.idInstance,
        external_instance_token: i.tokenInstance,
        current_status: mapFrontendStatusToDb(i.status),
      }));

    if (instancesPayload.length > 0) {
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
        body: {
          url: "https://n8n-n8n.nuwfic.easypanel.host/webhook/status_instances",
          payload: { instances: instancesPayload },
        },
      });

      if (proxyError) {
        console.error("Webhook error:", proxyError);
      } else {
        // Parse response — webhook-proxy returns { success, status, body }
        let results: any[] = [];
        try {
          const bodyData = typeof proxyData?.body === "string" 
            ? JSON.parse(proxyData.body) 
            : proxyData?.body || proxyData;
          results = Array.isArray(bodyData) ? bodyData : bodyData?.instances || [];
        } catch { /* ignore parse errors */ }

        // Update each instance whose status changed
        for (const result of results) {
          if (result.id && result.status) {
            const instance = instances.find(i => i.id === result.id);
            if (instance) {
              const currentDbStatus = mapFrontendStatusToDb(instance.status);
              if (result.status !== currentDbStatus) {
                await updateInstance({
                  id: result.id,
                  updates: { status: result.status },
                });
              }
            }
          }
        }
      }
    }

    await refetch();
    toast({
      title: t("instances.statusRefreshed"),
      description: t("instances.statusRefreshed"),
    });
  } catch (err) {
    console.error("Failed to refresh statuses:", err);
    toast({
      title: "Erro",
      description: "Falha ao atualizar status das instâncias.",
      variant: "destructive",
    });
  } finally {
    setIsRefreshing(false);
  }
};
```

### Expectativa do webhook n8n
O webhook receberá um POST com:
```json
{
  "instances": [
    { "id": "uuid", "name": "...", "external_instance_id": "...", "external_instance_token": "...", "current_status": "connected" }
  ]
}
```

E deve retornar um array com os status atualizados:
```json
[
  { "id": "uuid", "status": "connected" },
  { "id": "uuid", "status": "disconnected" }
]
```

### Arquivos
- `src/pages/Instances.tsx`

