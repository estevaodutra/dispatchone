

## Plano: Retornar dados da resposta do webhook na resposta final

### Problema
O `execute-message` já aguarda a resposta do webhook e a salva em `provider_response` no log, mas **não retorna esses dados** na resposta final da função. O chamador (trigger-sequence, frontend) não recebe os dados como `invitationLink`.

### Alteração

**Arquivo: `supabase/functions/execute-message/index.ts`**

1. Criar um array `webhookResponses` no início do loop de nós para acumular as respostas
2. No bloco de GROUP MANAGEMENT NODES (linha ~729), após parsear `responseData`, adicionar ao array
3. No bloco de MESSAGE NODES (nós normais), fazer o mesmo
4. Na resposta final (linha ~969), incluir `webhookResponses` no JSON retornado

```text
Antes (resposta final):
  { success, status, nodesProcessed, nodesFailed, groupsProcessed, totalTimeMs }

Depois:
  { success, status, nodesProcessed, nodesFailed, groupsProcessed, totalTimeMs, webhookResponses }
```

Cada item em `webhookResponses` terá:
```typescript
{
  nodeType: string,
  nodeOrder: number,
  destination: string,   // group_jid ou phone
  status: "sent" | "failed",
  data: responseData      // dados parseados do webhook
}
```

### Resultado
O chamador recebe os dados completos do webhook (ex: `invitationLink`, `phone`) na resposta, permitindo encadear ações baseadas no retorno.

1 arquivo, ~20 linhas.

