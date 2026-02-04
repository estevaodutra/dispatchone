

# Plano: Endpoint para Atualizar Status de Ligação

Criar um novo endpoint `POST /call-status` que permite atualizar ou criar registros de ligação com status específicos, capturando o `external_call_id` para sincronização com a API4com.

---

## Status Suportados

| Status | Descrição |
|--------|-----------|
| `dialing` | Ligando (padrão quando a ligação é iniciada com sucesso) |
| `ended` | Encerrado (quando a ligação é desligada) |
| `error` | Erro (quando ocorre falha na ligação) |

---

## Alterações Necessárias

| Recurso | Alteração |
|---------|-----------|
| **Banco de dados** | Adicionar coluna `external_call_id` e `call_status` na tabela `call_logs` |
| **`supabase/functions/call-status/index.ts`** | Nova edge function para atualizar/criar status |
| **`src/data/api-endpoints.ts`** | Documentar novo endpoint na categoria "Ligações" |
| **`src/hooks/useCallLogs.ts`** | Adicionar campos ao modelo |

---

## 1. Migração do Banco de Dados

```sql
-- Adicionar coluna para ID externo da ligação (API4com)
ALTER TABLE call_logs ADD COLUMN external_call_id text;

-- Adicionar coluna para status da ligação
ALTER TABLE call_logs ADD COLUMN call_status text DEFAULT 'dialing';

-- Índice para busca rápida pelo ID externo
CREATE INDEX idx_call_logs_external_call_id 
ON call_logs(external_call_id) 
WHERE external_call_id IS NOT NULL;
```

---

## 2. Nova Edge Function `call-status`

**Endpoint:** `POST /call-status`

**Request Body:**
```json
{
  "external_call_id": "0548b46f-326a-472e-aa02-06c53269c361",
  "status": "ended",
  "campaign_name": "FN | Carrinho Abandonado",
  "lead_phone": "5512983195531",
  "lead_name": "Ebonocleiton",
  "duration_seconds": 120,
  "error_message": null
}
```

**Lógica:**

1. Validar API key (mesmo padrão do `call-dial`)
2. Se `external_call_id` existir, buscar registro existente pelo ID externo
3. Se não encontrar e tiver `campaign_name` + `lead_phone`:
   - Buscar campanha pelo nome
   - Criar novo registro de ligação
4. Atualizar status da ligação:
   - `dialing`: Define `started_at` se não existir
   - `ended`: Define `ended_at` e calcula `duration_seconds`
   - `error`: Define `error_message` e `ended_at`
5. Retornar dados atualizados

**Responses:**

```json
// 200 - Atualizado com sucesso
{
  "success": true,
  "call_id": "uuid-interno",
  "external_call_id": "0548b46f-326a-472e-aa02-06c53269c361",
  "status": "ended",
  "duration_seconds": 120
}

// 201 - Criado novo registro
{
  "success": true,
  "call_id": "uuid-novo",
  "external_call_id": "0548b46f-326a-472e-aa02-06c53269c361",
  "status": "dialing",
  "created": true
}

// 404 - Ligação não encontrada (sem dados para criar)
{
  "success": false,
  "error": "call_not_found",
  "message": "Ligação não encontrada e dados insuficientes para criar"
}
```

---

## 3. Atualizar `call-dial` 

Modificar para capturar o `external_call_id` da resposta do webhook:

```typescript
// Após chamar webhook com sucesso
const webhookData = await webhookResponse.text();
try {
  const parsed = JSON.parse(webhookData);
  // [{ "id": "...", "message": "successfull" }]
  if (Array.isArray(parsed) && parsed[0]?.id) {
    await supabase
      .from('call_logs')
      .update({ 
        external_call_id: parsed[0].id,
        call_status: 'dialing'
      })
      .eq('id', callLog.id);
  }
} catch (e) {
  console.log('[call-dial] Could not parse webhook response');
}
```

---

## 4. Documentação da API

Adicionar à categoria "Ligações" em `api-endpoints.ts`:

```typescript
{
  id: "call-status",
  method: "POST",
  path: "/call-status",
  description: "Atualiza o status de uma ligação telefônica. Se a ligação não existir pelo external_call_id, pode criar um novo registro se informar campaign_name e lead_phone.",
  attributes: [
    { name: "external_call_id", type: "string", required: true, description: "ID externo da ligação (retornado pela API4com)" },
    { name: "status", type: "string", required: true, description: "Status da ligação: 'dialing', 'ended' ou 'error'" },
    { name: "campaign_name", type: "string", required: false, description: "Nome da campanha (obrigatório para criar nova ligação)" },
    { name: "lead_phone", type: "string", required: false, description: "Telefone do lead (obrigatório para criar nova ligação)" },
    { name: "lead_name", type: "string", required: false, description: "Nome do lead" },
    { name: "duration_seconds", type: "number", required: false, description: "Duração da ligação em segundos" },
    { name: "error_message", type: "string", required: false, description: "Mensagem de erro (quando status é 'error')" }
  ]
}
```

---

## 5. Atualizar Hook Frontend

```typescript
export interface CallLog {
  // ... campos existentes
  externalCallId: string | null;
  callStatus: string | null;
}

interface DbCallLog {
  // ... campos existentes
  external_call_id: string | null;
  call_status: string | null;
}
```

---

## Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE LIGAÇÃO                         │
└─────────────────────────────────────────────────────────────┘

[n8n/API4com]                    [Dispatch One]
     │                                 │
     │  POST /call-dial                │
     │  { campaign_name, lead_phone }  │
     │ ─────────────────────────────►  │
     │                                 │ Cria call_log
     │                                 │ Chama webhook API4com
     │ ◄───────────────────────────────│
     │  { id: "ext-123", ... }         │
     │                                 │ Salva external_call_id
     │                                 │
     │  ... Ligação em andamento ...   │
     │                                 │
     │  POST /call-status              │
     │  { external_call_id: "ext-123", │
     │    status: "ended",             │
     │    duration_seconds: 180 }      │
     │ ─────────────────────────────►  │
     │                                 │ Atualiza call_log
     │ ◄───────────────────────────────│
     │  { success: true }              │
     │                                 │
─────┴─────────────────────────────────┴──────────────────────

[Ligação não iniciada pelo Dispatch]

     │  POST /call-status              │
     │  { external_call_id: "ext-456", │
     │    status: "dialing",           │
     │    campaign_name: "Campanha X", │
     │    lead_phone: "551199999999" } │
     │ ─────────────────────────────►  │
     │                                 │ Cria novo call_log
     │ ◄───────────────────────────────│
     │  { success: true, created: true}│
```

