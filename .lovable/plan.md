

## Plano: Corrigir sync-group-members para Z-API

### Problema
Dois bugs impedem o `sync-group-members` de funcionar:

1. **Client-Token ausente** — Z-API retorna `400: "your client-token is not configured"` porque a função não envia o header `Client-Token`
2. **Formato do Group JID** — O sistema armazena `120363427443466552-group` mas Z-API espera `120363427443466552@g.us`

### Alterações

**1. `supabase/functions/sync-group-members/index.ts`**

- Adicionar header `Client-Token: Deno.env.get("ZAPI_CLIENT_TOKEN") || ""` na chamada Z-API (linha 58-61)
- Converter o `groupJid` de formato `-group` para `@g.us` antes de chamar Z-API:
  ```typescript
  const zapiGroupJid = groupJid.replace("-group", "@g.us");
  ```

**2. Verificar secret `ZAPI_CLIENT_TOKEN`**

- Confirmar se o secret existe no Supabase. Se não existir, solicitar ao usuário que forneça o valor do Client-Token da Z-API

**3. Simular novamente** após o fix para validar que o sync funciona corretamente com o último evento de join da campanha "Captação"

### Resultado
- A chamada Z-API para `group-metadata` funciona com autenticação correta
- Group JIDs são convertidos automaticamente para o formato esperado pela Z-API
- O sync compara membros e salva com telefones reais

