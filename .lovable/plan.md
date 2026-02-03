
# Plano: Corrigir Erro 500 no Endpoint phone-validation

## Problema Identificado

Analisando os dados do banco, encontrei a causa raiz do erro 500:

### Situacao Atual

A API key usada na requisição (`pk_live_a36b6b60a9bbc625521cac798...`) está registrada no banco, porém com `user_id: NULL`:

```
| API Key Name | user_id                              | Instâncias Vinculadas |
|--------------|--------------------------------------|----------------------|
| N8N          | 3b6be6fe-4c64-4570-8b62-ae5362bc56af | 2 instâncias         |
| N8N V2       | NULL                                 | 0 instâncias         |
| N8N (antiga) | NULL                                 | 0 instâncias         |
```

### Fluxo do Erro

1. A requisição chega com uma API key válida
2. A validação de API key passa (token existe e não está revogado)
3. O código tenta buscar instâncias com `.eq('user_id', authResult.apiKey.user_id)`
4. Quando `user_id` é `null`, a query se comporta de forma inesperada ou falha
5. O catch genérico retorna "Erro interno ao validar número" (500)

---

## Solução Proposta

Adicionar validação explícita para `user_id` nulo após a autenticação da API key:

### Mudanças no Arquivo: `supabase/functions/phone-validation/index.ts`

```typescript
// Após a validação da API key (linha 86), adicionar verificação:
if (!authResult.apiKey.user_id) {
  console.error('API key has no user_id associated:', authResult.apiKey.id);
  return new Response(
    JSON.stringify({
      success: false,
      error: { 
        code: 'API_KEY_NOT_LINKED', 
        message: 'Esta API key não está vinculada a um usuário. Regenere a chave no painel.' 
      }
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Melhorias Adicionais

1. **Adicionar logs mais detalhados** para facilitar debug futuro
2. **Validar cada etapa** antes de prosseguir para evitar erros silenciosos
3. **Retornar mensagens de erro específicas** em vez do genérico "Erro interno"

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/phone-validation/index.ts`

**Linha 86-87** (após validação da API key):
```typescript
// Verificar se a API key tem user_id associado
if (!authResult.apiKey.user_id) {
  console.error('[phone-validation] API key without user_id:', authResult.apiKey.id);
  return new Response(
    JSON.stringify({
      success: false,
      error: { 
        code: 'API_KEY_NOT_LINKED', 
        message: 'Esta API key não está vinculada a um usuário. Regenere a chave no painel.' 
      }
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Linhas 114-134** (melhorar logging da busca de instância):
```typescript
console.log(`[phone-validation] Looking for instance for user: ${authResult.apiKey.user_id}`);

const { data: instance, error: instanceError } = await supabase
  .from('instances')
  .select('id, name, provider, external_instance_id, external_instance_token')
  .eq('status', 'connected')
  .eq('user_id', authResult.apiKey.user_id)
  .limit(1)
  .maybeSingle();

if (instanceError) {
  console.error('[phone-validation] Error fetching instance:', instanceError);
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'DB_ERROR', message: 'Erro ao buscar instância conectada.' }
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

if (!instance) {
  console.log('[phone-validation] No connected instance found for user:', authResult.apiKey.user_id);
  // ... resto do código existente
}
```

---

## Ação Adicional Recomendada

Corrigir as API keys existentes que não têm `user_id`:

```sql
-- Verificar API keys sem user_id
SELECT id, name, user_id, created_at 
FROM api_keys 
WHERE user_id IS NULL;

-- Opção 1: Deletar as chaves órfãs (recomendado)
DELETE FROM api_keys WHERE user_id IS NULL;

-- Opção 2: Vincular a um usuário existente
UPDATE api_keys 
SET user_id = '3b6be6fe-4c64-4570-8b62-ae5362bc56af' 
WHERE id IN ('515bdfe5-d22a-441b-8539-cad0a0fe2d46', '2bdde9e4-5e6b-4115-9ba4-01649d5e8924');
```

---

## Resultado Esperado

### Antes
- Requisição com API key sem user_id: Erro 500 genérico

### Depois
- Requisição com API key sem user_id: Erro 403 com mensagem clara "API key não está vinculada a um usuário"
- Logs detalhados para debug rápido

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Adicionar validação de user_id + melhorar logs |
