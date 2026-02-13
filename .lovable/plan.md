

# Corrigir URL do Webhook na Edge Function de Disparos

## Problema

A edge function `execute-dispatch-sequence` envia mensagens para o webhook errado: `https://n8n-n8n.nuwfic.easypanel.host/webhook/messages` em vez de `https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages`.

A URL correta esta definida no arquivo `src/data/webhook-categories.ts` como default da categoria "Mensagens", mas a edge function usa uma constante diferente.

A mesma inconsistencia existe na edge function `execute-message` (campanhas de grupo), que tambem usa `/webhook/messages`.

## Solucao

### 1. Corrigir `execute-dispatch-sequence/index.ts` (linha 8)

Alterar a constante `DEFAULT_MESSAGES_WEBHOOK`:

```
De: "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages"
Para: "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages"
```

### 2. Corrigir `execute-message/index.ts` (linha 9)

Mesma correcao para manter consistencia com grupos:

```
De: "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages"
Para: "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages"
```

## Arquivos modificados

1. `supabase/functions/execute-dispatch-sequence/index.ts` - Corrigir URL do webhook default
2. `supabase/functions/execute-message/index.ts` - Corrigir URL do webhook default

## Resultado esperado

As mensagens de disparos serao enviadas ao endpoint correto (`/webhook/send_messages`), consistente com a configuracao do sistema.

