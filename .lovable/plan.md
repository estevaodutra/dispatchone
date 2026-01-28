

## Correção: Adicionar Client-Token ao Z-API

### Problema Identificado

O Z-API retorna erro 400: `"your client-token is not configured"` porque a API requer um header `Client-Token` para autenticação, além do token na URL.

**Estrutura de autenticação do Z-API:**
- URL: `https://api.z-api.io/instances/{instanceId}/token/{instanceToken}/...`
- Header obrigatório: `Client-Token: {clientToken}`

### Solução

Precisamos adicionar o campo `external_client_token` à tabela `instances` e incluí-lo nas chamadas à API do Z-API.

---

### 1. Migração do Banco de Dados

Adicionar coluna `external_client_token` à tabela `instances`:

```sql
ALTER TABLE public.instances 
ADD COLUMN IF NOT EXISTS external_client_token text;

COMMENT ON COLUMN public.instances.external_client_token IS 'Client token for Z-API authentication header';
```

---

### 2. Atualizar Edge Function phone-validation

**Arquivo:** `supabase/functions/phone-validation/index.ts`

Modificar a query para incluir o novo campo:

```typescript
const { data: instance } = await supabase
  .from('instances')
  .select('id, name, external_instance_id, external_instance_token, external_client_token')
  .eq('status', 'connected')
  .eq('user_id', authResult.apiKey.user_id)
  .limit(1)
  .maybeSingle();
```

Adicionar validação do client token:

```typescript
if (!instance.external_client_token) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'INSTANCE_NOT_CONFIGURED',
        message: 'A instância não possui Client-Token configurado.'
      }
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Incluir o header na chamada ao Z-API:

```typescript
const zapiResponse = await fetch(zapiUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Client-Token': instance.external_client_token
  }
});
```

---

### 3. Atualizar Interface de Instâncias

**Arquivo:** `src/pages/Instances.tsx` (ou componente de edição)

Adicionar campo para o Client-Token no formulário de configuração da instância.

---

### 4. Atualizar Hook useInstances

**Arquivo:** `src/hooks/useInstances.ts`

Incluir `external_client_token` nas operações de create/update.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar coluna `external_client_token` |
| `supabase/functions/phone-validation/index.ts` | Buscar e enviar Client-Token |
| `src/pages/Instances.tsx` | Campo para configurar Client-Token |
| `src/hooks/useInstances.ts` | Incluir novo campo |

---

### Configuração Manual Necessária

Após a implementação, o usuário precisará:

1. Acessar o painel do Z-API
2. Copiar o Client-Token da instância
3. Colar no campo correspondente na página de Instâncias do dispatchOne

---

### Resultado Esperado

O endpoint `/phone-validation` funcionará corretamente após o usuário configurar o Client-Token da sua instância Z-API.

