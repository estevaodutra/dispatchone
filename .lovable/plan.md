

## Correção: Tratar resposta do webhook como array

### Problema

O webhook n8n retorna um array com o objeto de resposta, mas o código tenta acessar as propriedades diretamente no array, resultando em `undefined`.

### Arquivo a Modificar

**`supabase/functions/phone-validation/index.ts`**

### Alteração (linhas 178-189)

**Código atual:**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    exists: result.exists === true || result.exists === 'true',
    phone: result.phone || cleanPhone,
    lid: result.lid || null,
    instance_used: instance.name
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

**Código corrigido:**
```typescript
// Se o resultado for um array, pegar o primeiro elemento
const data = Array.isArray(result) ? result[0] : result;

return new Response(
  JSON.stringify({
    success: true,
    exists: data?.exists === true || data?.exists === 'true',
    phone: data?.phone || cleanPhone,
    lid: data?.lid || null,
    instance_used: instance.name
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Resumo

| Problema | Solução |
|----------|---------|
| `result` é um array `[{...}]` | Extrair primeiro elemento com `result[0]` |
| `result.exists` retorna `undefined` | Usar `data?.exists` após extrair |

### Resultado Esperado

```json
{
  "success": true,
  "exists": true,
  "phone": "5512982402981",
  "lid": "171296717553783@lid",
  "instance_used": "Mauro"
}
```

