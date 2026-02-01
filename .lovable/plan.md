
# Plano: Correção do Endpoint `/instances`

## Problemas Identificados

### 1. Campo `externalInstanceToken` não retornado
A Edge Function `instances` (linha 178-188) mapeia os campos do banco para camelCase, mas **omite** o campo `external_instance_token`:

```javascript
// Atual - FALTA o externalInstanceToken
const mappedInstances = (instances || []).map((inst: any) => ({
  id: inst.id,
  name: inst.name,
  phone: inst.phone,
  status: inst.status,
  provider: inst.provider,
  externalInstanceId: inst.external_instance_id,
  createdAt: inst.created_at,
  lastMessageAt: inst.last_message_at,
  messagesCount: inst.messages_count
}));
```

### 2. Instâncias excluídas aparecem na API
Pelo que vejo no banco, há 5 instâncias ativas. O hook `useInstances` usa `delete()` corretamente para remover instâncias. Se uma instância deveria ter sido excluída mas ainda aparece, pode ser:
- A operação de delete falhou silenciosamente
- O usuário apenas "desconectou" em vez de deletar

O sistema está funcionando como projetado: quando o delete é chamado, ele remove permanentemente do banco. Se ainda está no banco, nunca foi excluído.

---

## Mudanças Propostas

### 1. Adicionar `externalInstanceToken` na resposta do endpoint `/instances`

**Arquivo:** `supabase/functions/instances/index.ts`

Modificar o mapeamento para incluir o token:

```javascript
const mappedInstances = (instances || []).map((inst: any) => ({
  id: inst.id,
  name: inst.name,
  phone: inst.phone,
  status: inst.status,
  provider: inst.provider,
  externalInstanceId: inst.external_instance_id,
  externalInstanceToken: inst.external_instance_token, // NOVO
  createdAt: inst.created_at,
  lastMessageAt: inst.last_message_at,
  messagesCount: inst.messages_count
}));
```

### 2. Atualizar endpoint `instance-find` para retornar token também

**Arquivo:** `supabase/functions/instance-find/index.ts`

O comentário na linha 179 diz "excluding sensitive data like external_instance_token", mas se o endpoint `/instances` retorna, faz sentido manter consistência:

```javascript
instance: {
  id: foundInstance.id,
  name: foundInstance.name,
  phone: foundInstance.phone,
  status: foundInstance.status,
  provider: foundInstance.provider,
  externalInstanceId: foundInstance.external_instance_id,
  externalInstanceToken: foundInstance.external_instance_token, // NOVO
  createdAt: foundInstance.created_at,
  lastMessageAt: foundInstance.last_message_at,
  messagesCount: foundInstance.messages_count
}
```

### 3. (Opcional) Limpeza manual de dados órfãos

Se houver instâncias específicas que você quer remover, posso executar um DELETE direto. Caso contrário, o hook `deleteInstance` no frontend está funcionando corretamente.

---

## Resumo Técnico

| Item | Arquivo | Alteração |
|------|---------|-----------|
| 1 | `supabase/functions/instances/index.ts` | Adicionar `externalInstanceToken` no mapeamento |
| 2 | `supabase/functions/instance-find/index.ts` | Adicionar `externalInstanceToken` na resposta |

---

## Validação Pós-Implementação

1. Chamar `GET /instances?page=1&limit=10` e confirmar que `externalInstanceToken` aparece na resposta
2. Chamar `GET /instance-find?instanceId=<id>` e confirmar consistência
3. Testar exclusão de instância pelo frontend para garantir que remove do banco

