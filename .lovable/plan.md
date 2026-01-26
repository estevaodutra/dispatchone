

# Plano: Corrigir Eventos Não Aparecendo no Painel

## Diagnóstico

**Problema Identificado:** Os eventos estão sendo salvos no banco de dados com `user_id = NULL`, e a política RLS (`user_id = auth.uid()`) impede que qualquer usuário os visualize.

**Causa Raiz:**
1. O n8n está enviando payloads onde o campo `instance_id` não é detectado automaticamente
2. Quando `external_instance_id = "unknown"`, não há correspondência na tabela `instances`
3. Sem correspondência, `user_id` fica `NULL`
4. Eventos com `user_id = NULL` são invisíveis para todos os usuários devido ao RLS

**Evidência do Banco:**
```
id: db1ef16a-42de... | user_id: NULL | external_instance_id: unknown
id: 9f56e234-a095... | user_id: NULL | external_instance_id: unknown
```

---

## Solução Proposta

### Opção A: Ajustar o n8n (Recomendado)

Configurar o workflow n8n para enviar o `instance_id` correto no payload:

```javascript
// Node Code no n8n
return {
  json: {
    source: "z-api",
    instance_id: $input.first().json.instanceId,  // Campo correto da Z-API
    raw_event: $input.first().json
  }
};
```

### Opção B: Adicionar Política RLS para Eventos Públicos

Criar uma política que permita visualizar eventos mesmo quando `user_id` é `NULL`. Isso é menos seguro, pois todos os usuários veriam todos os eventos sem `user_id`.

### Opção C: Melhorar Detecção de Instance ID (Implementar)

Modificar a Edge Function para extrair melhor o `instance_id` dos payloads da Z-API.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Melhorar detecção de instance_id |

---

## Mudanças na Edge Function

Analisar melhor a estrutura do payload Z-API para extrair o `instance_id`:

```typescript
// Campos possíveis na Z-API para instance_id
const instanceId = body.instanceId ||           // Padrão Z-API
                   body.data?.instanceId ||     // Dentro de data
                   body.instance?.id ||         // Objeto instance
                   body.phone ||                // Fallback para telefone
                   body.sender?.phone ||
                   "unknown";
```

---

## Correção Imediata para Eventos Existentes

Após identificar o `user_id` correto, executar update nos eventos órfãos:

```sql
UPDATE webhook_events 
SET user_id = 'UUID_DO_USUARIO'
WHERE user_id IS NULL 
  AND external_instance_id = 'unknown';
```

---

## Passos de Implementação

1. **Analisar raw_event salvo** - Verificar estrutura real do payload Z-API
2. **Melhorar detecção** - Atualizar Edge Function com campos adicionais
3. **Atualizar eventos existentes** - Associar `user_id` aos eventos órfãos
4. **Testar novamente** - Enviar novo evento e verificar painel

---

## Seção Técnica

### Estrutura Típica do Payload Z-API

```json
{
  "event": "message.received",
  "instanceId": "3E2535E6DDA3413414F54AAAADA6D328",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0ABCD1234"
    },
    "message": {
      "conversation": "Olá!"
    },
    "pushName": "João"
  }
}
```

O campo `instanceId` está na **raiz** do payload. A Edge Function atual verifica:
- `body.instanceId` - Deveria funcionar
- `body.instance` - Campo diferente
- `body.phone` - Campo diferente

**Possível problema:** O payload pode estar em `body.raw_event` quando auto-encapsulado, mas verificamos `body.instanceId` antes do encapsulamento.

---

## Verificação Adicional Necessária

Antes de implementar, preciso ver a estrutura real do `raw_event` salvo no banco para confirmar onde está o `instanceId`:

```sql
SELECT raw_event FROM webhook_events LIMIT 1;
```

