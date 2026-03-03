

## Diagnóstico

**Causa raiz**: O operador Mauro (user_id `7848b4ff`) não consegue ver o card da ligação porque o `call_log` associado tem `company_id = NULL`. A política RLS de `call_logs` exige `is_company_member(company_id, auth.uid())` quando `company_id` é preenchido, mas quando é NULL, exige `user_id = auth.uid()`. Como o call_log foi criado com `user_id` do admin (`3b6be6fe`), Mauro não tem acesso de leitura.

O hook `useOperatorCall` chama `fetchCallData(current_call_id)` → a query retorna `null` por RLS → o card não aparece.

**Escopo do problema**: 484 de 1126 call_logs têm `company_id = NULL`. Isso afeta todos os operadores que não sejam o admin criador da campanha.

### Onde falta `company_id`

| Arquivo | Linha | Status |
|---------|-------|--------|
| `queue-processor/index.ts` | 287 | ✅ Já tem `campaign.company_id` |
| `call-dial/index.ts` | 464 | ✅ Já tem `campaign.company_id` |
| `call-status/index.ts` | 423 | ✅ Já tem `campaign.company_id` |
| **`call-status/index.ts`** | **651** | ❌ **Falta `company_id`** (retry) |
| `reschedule-failed-calls/index.ts` | 134 | ✅ Já tem |

A inserção de retry no `call-status` (linha 649-661) não inclui `company_id`. Mas o problema maior é que muitos logs antigos já estão sem `company_id`.

## Correção (3 partes)

### 1. Migration: Backfill company_id nos call_logs existentes

```sql
UPDATE call_logs cl
SET company_id = cc.company_id
FROM call_campaigns cc
WHERE cl.campaign_id = cc.id
  AND cl.company_id IS NULL
  AND cc.company_id IS NOT NULL;
```

Isso corrige os 484 registros existentes de uma vez.

### 2. Edge function `call-status/index.ts` — adicionar company_id no retry

Na inserção de retry (linha 649-661), adicionar `company_id: callLog.company_id || null` para que futuras retentativas herdem o company_id.

### 3. Edge function `call-status/index.ts` — garantir company_id vindo do campaign

Na mesma função, o `callLog` usado no retry pode já ter `company_id = null` se for antigo. Buscar `company_id` do campaign se necessário como fallback.

