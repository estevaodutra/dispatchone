

# Plano: Corrigir Tratamento de Resposta Vazia do Webhook

## Problema Identificado

Os logs da Edge Function mostram o erro real:

```
ERROR Error validating phone: SyntaxError: Unexpected end of JSON input
```

### Fluxo Atual

1. A instância é encontrada corretamente
2. O webhook n8n é chamado com sucesso
3. O webhook retorna status 200, mas com **corpo vazio**
4. `await webhookResponse.json()` (linha 204) falha porque não há JSON para parsear
5. O erro é capturado no catch genérico e retorna "Erro interno ao validar número"

---

## Solução

Adicionar tratamento robusto para respostas vazias ou não-JSON do webhook.

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/phone-validation/index.ts`

**Linhas 204-209** - Adicionar tratamento seguro para JSON:

### Antes (problemático)
```typescript
const result = await webhookResponse.json();

console.log('Webhook response:', result);

// Se o resultado for um array, pegar o primeiro elemento
const data = Array.isArray(result) ? result[0] : result;
```

### Depois (robusto)
```typescript
// Ler resposta como texto primeiro para debug
const responseText = await webhookResponse.text();
console.log('[phone-validation] Webhook raw response:', responseText);

// Tentar parsear JSON, tratar resposta vazia
let result: any = null;
if (responseText && responseText.trim()) {
  try {
    result = JSON.parse(responseText);
    console.log('[phone-validation] Webhook parsed response:', result);
  } catch (parseError) {
    console.error('[phone-validation] Failed to parse webhook response:', parseError);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'WEBHOOK_PARSE_ERROR',
          message: 'Resposta do webhook em formato inválido.'
        }
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
} else {
  console.warn('[phone-validation] Webhook returned empty response');
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'WEBHOOK_EMPTY_RESPONSE',
        message: 'O webhook de validação retornou uma resposta vazia. Verifique a configuração do n8n.'
      }
    }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Se o resultado for um array, pegar o primeiro elemento
const data = Array.isArray(result) ? result[0] : result;
```

---

## Melhorias Adicionais

1. **Logging detalhado** - Registrar a resposta bruta do webhook para debug
2. **Tratamento de resposta vazia** - Retornar erro específico (502 com código `WEBHOOK_EMPTY_RESPONSE`)
3. **Tratamento de JSON inválido** - Retornar erro específico (502 com código `WEBHOOK_PARSE_ERROR`)
4. **Mensagens claras** - Indicar que o problema está no webhook n8n

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Webhook retorna vazio | Erro 500 genérico | Erro 502 "Resposta vazia" |
| Webhook retorna JSON inválido | Erro 500 genérico | Erro 502 "Formato inválido" |
| Webhook retorna JSON válido | Funciona | Funciona |
| Webhook offline | Erro 502 | Erro 502 (mesmo) |

---

## Logs Esperados

Com a correção, os logs mostrarão:

```
[phone-validation] Looking for any connected instance...
Sending phone validation to webhook: 5548996078227
[phone-validation] Webhook raw response: ""
[phone-validation] Webhook returned empty response
```

Isso facilitará identificar que o problema está no webhook n8n, não no código.

---

## Nota sobre o Webhook n8n

O webhook `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent` precisa ser configurado para retornar uma resposta JSON válida. Por exemplo:

```json
{
  "exists": true,
  "phone": "5548996078227",
  "lid": "opcional_lid"
}
```

Verifique se o workflow no n8n está retornando dados corretamente no nó de resposta (Respond to Webhook).

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Tratar resposta vazia/inválida do webhook |

