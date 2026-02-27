

## Plano: Corrigir parsing de membros na extração

### Problema raiz
O webhook retorna membros com campo `id` (ex: `5511999999999@s.whatsapp.net`) em vez de `phone`. O código na linha 354 verifica `m.phone` que não existe, então **todos os membros são ignorados** pelo `continue`. O resultado é 0 leads extraídos, e portanto nada é importado no passo 4.

### Correções em `src/components/leads/ExtractLeadsDialog.tsx`

**1. Extrair telefone de `m.id` ou `m.phone` (linha ~353-355):**
```typescript
// Normalizar: o webhook pode retornar phone OU id (JID format)
const rawPhone = m.phone || m.id || "";
if (!rawPhone || rawPhone.includes("-group") || rawPhone.includes("@g.us")) continue;
const phone = rawPhone.replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "");
```

**2. Expandir parsing de `membersList` (linha ~340-351):**
Adicionar suporte para:
- `data.data` (wrapper comum de APIs)
- `data.data.participants`
- Array de objetos com `id` direto (sem wrapper `participants`)

**3. Adicionar fallback para `m.name` (linha ~378):**
Usar `m.name || m.pushName || m.notify || null` para cobrir diferentes formatos.

**4. Adicionar `console.log` do `membersList.length` e do primeiro membro** para diagnóstico futuro.

### Sem outras mudanças necessárias
A lógica de upsert (passo 4), invalidação de queries e sync com `call_leads`/`dispatch_campaign_contacts` já está correta — o problema é exclusivamente que `extractedMembers` fica vazio porque o campo `phone` não existe nos dados retornados.

