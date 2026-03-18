

## Plano: Reclassificar todos os eventos e verificar consistência

### Diagnóstico atual

| Métrica | Valor |
|---------|-------|
| Total de eventos | 252,626 |
| Sem `matched_rule` (lógica antiga) | 251,758 (99.7%) |
| Com `matched_rule` (classificador unificado) | 868 |

O batch atual do `reclassify-events` só processa eventos com `event_type IN ('image_message', 'unknown', 'text_message')` — isso cobre apenas **145,283** dos 251,758 pendentes. Os outros **106,475** eventos (message_received, played, message_read, group_join, etc.) estão corretamente tipados mas sem os metadados `matched_rule`, `confidence` e `direction`.

### Amostras verificadas

- `image_message` com `body.image` → classificador retornará `image_message` (Rule 2, high) -- **correto**
- `image_message` com `body.text.message` e sem `body.image` → classificador retornará `text_message` (Rule 11, high) -- **corrige erro**
- `image_message` com `body.photo` (foto de perfil) → classificador ignora `photo`, classifica pelo conteúdo real -- **corrige erro**
- `message_received` com `body.status = "RECEIVED"` → classificador retornará `message_received` (Rule 10, high) -- **mantém tipo, adiciona metadata**
- `unknown` com `body.status = "RECEIVED"` → classificador retornará `message_received` (Rule 10, high) -- **corrige erro**

### Mudança necessária

**Arquivo:** `supabase/functions/reclassify-events/index.ts`

Atualizar o filtro batch (linha 159) para incluir todos os eventos sem `matched_rule`:

```typescript
// Antes:
query = query.in("event_type", ["image_message", "unknown", "text_message"]);

// Depois:
query = query.is("matched_rule", null);
```

Isso garante que TODOS os 251,758 eventos antigos sejam reprocessados pelo classificador unificado, preenchendo `matched_rule`, `confidence` e `direction`, e corrigindo tipos errados.

### Execução

1. Aplicar a mudança no filtro
2. Rodar a reclassificação via UI (botão "Reclassificar Tudo") — processa em lotes de 2000 com cursor
3. Verificar distribuição final com query de validação

### Validação esperada

Após a reclassificação completa, todos os eventos terão `matched_rule IS NOT NULL` e `confidence IN ('high', 'medium')`. Eventos que eram `image_message` incorretamente (com `body.text.message` sem `body.image`) serão corrigidos para `text_message`.

