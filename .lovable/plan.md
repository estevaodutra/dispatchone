

# Plano: Armazenar ID Externo da Ligação (API4com)

Modificar o sistema para capturar e armazenar o ID retornado pelo webhook do n8n/API4com, permitindo identificar a ligação quando ela for desligada.

---

## Contexto

Quando o webhook é acionado, a resposta esperada é:
```json
[
  {
    "id": "0548b46f-326a-472e-aa02-06c53269c361",
    "message": "successfull"
  }
]
```

O campo `id` é o identificador da ligação na API4com. Este ID precisa ser armazenado no `call_logs` para que, quando a ligação for desligada, seja possível identificar qual registro atualizar.

---

## Alterações Necessárias

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| **Banco de dados** | Adicionar coluna `external_call_id` na tabela `call_logs` |
| **`supabase/functions/call-dial/index.ts`** | Parsear resposta do webhook e salvar o ID externo |
| **`src/hooks/useCallLogs.ts`** | Incluir campo `externalCallId` no modelo |

---

## 1. Migração do Banco de Dados

```sql
ALTER TABLE call_logs 
ADD COLUMN external_call_id text;

-- Índice para busca rápida quando a ligação for desligada
CREATE INDEX idx_call_logs_external_call_id 
ON call_logs(external_call_id) 
WHERE external_call_id IS NOT NULL;
```

---

## 2. Modificar Edge Function `call-dial`

Após chamar o webhook com sucesso, parsear a resposta JSON e extrair o `id`:

```typescript
// Após receber resposta do webhook (linha 577)
const webhookData = await webhookResponse.text();
let externalCallId: string | null = null;

// Tentar parsear resposta e extrair ID externo
try {
  const parsedResponse = JSON.parse(webhookData);
  // Resposta é um array: [{ id: "...", message: "..." }]
  if (Array.isArray(parsedResponse) && parsedResponse[0]?.id) {
    externalCallId = parsedResponse[0].id;
    console.log('[call-dial] External call ID received:', externalCallId);
    
    // Atualizar call_log com o ID externo
    await supabase
      .from('call_logs')
      .update({ external_call_id: externalCallId })
      .eq('id', callLog.id);
  }
} catch (parseError) {
  console.log('[call-dial] Could not parse webhook response as JSON');
}
```

---

## 3. Atualizar Hook `useCallLogs`

Adicionar o novo campo ao modelo:

```typescript
export interface CallLog {
  // ... campos existentes
  externalCallId: string | null;
}

interface DbCallLog {
  // ... campos existentes
  external_call_id: string | null;
}

const transformDbToFrontend = (db: DbCallLog): CallLog => ({
  // ... campos existentes
  externalCallId: db.external_call_id,
});
```

---

## Fluxo Atualizado

```text
[POST /call-dial]
      |
      v
[Cria registro em call_logs]
      |
      v
[Chama webhook API4com]
      |
      v
[Parseia resposta: { id: "xxx", message: "successfull" }]
      |
      v
[Atualiza call_logs.external_call_id = "xxx"]
      |
      v
[Retorna resposta com external_call_id]
```

---

## Uso Futuro

Quando a ligação for desligada (evento de hangup), o sistema poderá:

```sql
-- Buscar ligação pelo ID externo
UPDATE call_logs 
SET ended_at = NOW(), 
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
WHERE external_call_id = '0548b46f-326a-472e-aa02-06c53269c361';
```

---

## Resposta Atualizada (201)

```json
{
  "success": true,
  "call_id": "uuid-interno",
  "external_call_id": "0548b46f-326a-472e-aa02-06c53269c361",
  "status": "dialing",
  "campaign": { ... },
  "lead": { ... },
  "operator": { ... },
  "webhook": {
    "called": true,
    "url": "https://n8n.../webhook/calls",
    "status": 200
  }
}
```

