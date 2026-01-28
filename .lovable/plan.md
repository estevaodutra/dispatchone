

## Correção: Adicionar campo `provider` ao payload

### Problema Identificado

O payload enviado ao webhook n8n está faltando o campo `provider` da instância, que é necessário para identificar qual API usar (z-api, evolution, etc.).

### Alteração Necessária

**Arquivo:** `supabase/functions/phone-validation/index.ts`

### Mudanças

**1. Linha 117 - Adicionar `provider` na query:**

```typescript
// De:
.select('id, name, external_instance_id, external_instance_token')

// Para:
.select('id, name, provider, external_instance_id, external_instance_token')
```

**2. Linhas 155-164 - Adicionar `provider` no payload:**

```typescript
// De:
const webhookPayload = {
  action: 'validation.phone_exists',
  instance: {
    id: instance.id,
    name: instance.name,
    external_instance_id: instance.external_instance_id,
    external_instance_token: instance.external_instance_token
  },
  phone: cleanPhone
};

// Para:
const webhookPayload = {
  action: 'validation.phone_exists',
  instance: {
    id: instance.id,
    name: instance.name,
    provider: instance.provider,
    external_instance_id: instance.external_instance_id,
    external_instance_token: instance.external_instance_token
  },
  phone: cleanPhone
};
```

### Payload Resultante

```json
{
  "action": "validation.phone_exists",
  "instance": {
    "id": "07bbc66e-02a9-4203-b77a-c2d98370281b",
    "name": "Mauro",
    "provider": "z-api",
    "external_instance_id": "3E249F618B74B1ABEF461664B40E8DC7",
    "external_instance_token": "39634632AE91F414F083E442"
  },
  "phone": "5512983195531"
}
```

### Arquivo a Modificar

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `supabase/functions/phone-validation/index.ts` | 117, 159 | Adicionar campo `provider` |

