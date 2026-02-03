

# Plano: Corrigir phone-validation para usar Instancia Global

## Problema Identificado

O endpoint atualmente filtra instancias pelo `user_id` da API key:

```typescript
// Linha 119 - PROBLEMA
.eq('user_id', authResult.apiKey.user_id)
```

Quando a API key nao tem `user_id` vinculado, a query falha e retorna erro 500.

## Solucao

Remover o filtro por `user_id` e buscar **qualquer instancia conectada** disponivel no sistema.

---

## Mudancas Tecnicas

### Arquivo: `supabase/functions/phone-validation/index.ts`

**Linha 114-121** - Alterar a query para buscar qualquer instancia conectada:

### Antes (incorreto)
```typescript
// Find a connected instance for this user
const { data: instance, error: instanceError } = await supabase
  .from('instances')
  .select('id, name, provider, external_instance_id, external_instance_token')
  .eq('status', 'connected')
  .eq('user_id', authResult.apiKey.user_id)  // ❌ Filtro desnecessário
  .limit(1)
  .maybeSingle();
```

### Depois (correto)
```typescript
// Find ANY connected instance available in the system
console.log('[phone-validation] Looking for any connected instance...');

const { data: instance, error: instanceError } = await supabase
  .from('instances')
  .select('id, name, provider, external_instance_id, external_instance_token')
  .eq('status', 'connected')
  .not('external_instance_id', 'is', null)  // Garantir que tem credenciais
  .not('external_instance_token', 'is', null)
  .limit(1)
  .maybeSingle();

if (instanceError) {
  console.error('[phone-validation] Error fetching instance:', instanceError);
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'DB_ERROR', message: 'Erro ao buscar instancia conectada.' }
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

if (!instance) {
  console.log('[phone-validation] No connected instance found in the system');
  // ... resto do codigo existente
}
```

**Linha 124** - Atualizar mensagem de log:

```typescript
// Antes
console.log('No connected instance found for user:', authResult.apiKey.user_id);

// Depois
console.log('[phone-validation] No connected instance available in the system');
```

---

## Beneficios

1. **API keys sem user_id funcionam** - Nao precisa de vinculacao
2. **Maior disponibilidade** - Qualquer instancia conectada pode ser usada
3. **Menos pontos de falha** - Remove dependencia de user_id
4. **Melhor logging** - Identifica problemas mais facilmente

---

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| API key sem user_id | Erro 500 | Funciona (usa qualquer instancia) |
| API key com user_id | Funciona | Funciona (ignora user_id) |
| Sem instancia conectada | Erro 503 | Erro 503 (mesmo comportamento) |

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Remover filtro user_id + melhorar logs |

