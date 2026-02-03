

# Plano: Implementar Logging de Chamadas da API

## Problema Identificado

A tabela `api_logs` está vazia porque **nenhuma Edge Function está gravando logs** de chamadas da API. O sistema possui:

1. A tabela `api_logs` com a estrutura correta
2. O hook `useApiLogs` para ler os dados
3. A página `/logs` com aba "Logs da API" para exibir os dados
4. A Edge Function `cleanup-logs` para limpar logs antigos

**O que está faltando:** Código nas Edge Functions para inserir registros na tabela `api_logs`.

---

## Arquitetura Proposta

Criar um utilitário de logging reutilizável e integrá-lo nas Edge Functions que expõem a API pública.

---

## Mudanças Técnicas

### 1. Adicionar Logging na Edge Function `phone-validation`

**Arquivo:** `supabase/functions/phone-validation/index.ts`

Adicionar função auxiliar para gravar logs e chamá-la antes de cada resposta:

```typescript
// Função para registrar log da API
async function logApiCall(
  supabase: any,
  params: {
    method: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs: number;
    userId?: string;
    apiKeyId?: string;
    ipAddress?: string;
    requestBody?: object;
    responseBody?: object;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('api_logs').insert({
      method: params.method,
      endpoint: params.endpoint,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      ip_address: params.ipAddress,
      request_body: params.requestBody,
      response_body: params.responseBody,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('[api-log] Failed to log API call:', error);
  }
}
```

**Integração no fluxo:**
- Capturar timestamp de início da requisição
- Extrair IP do header `x-forwarded-for` ou `x-real-ip`
- Chamar `logApiCall()` antes de retornar cada Response

### 2. Adicionar Logging na Edge Function `message-content`

**Arquivo:** `supabase/functions/message-content/index.ts`

Mesmo padrão de logging.

### 3. Adicionar Logging na Edge Function `validate-api-key`

**Arquivo:** `supabase/functions/validate-api-key/index.ts`

Mesmo padrão de logging.

---

## Edge Functions a Atualizar

| Função | Endpoint | Prioridade |
|--------|----------|------------|
| `phone-validation` | `/phone-validation` | Alta |
| `message-content` | `/message-content` | Alta |
| `validate-api-key` | `/validate-api-key` | Média |

---

## Exemplo de Implementação Completa

```typescript
// No início do handler
const startTime = Date.now();
const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
               || req.headers.get('x-real-ip') 
               || 'unknown';

// Antes de cada return Response
const responseTime = Date.now() - startTime;
await logApiCall(supabase, {
  method: req.method,
  endpoint: '/phone-validation',
  statusCode: 200,
  responseTimeMs: responseTime,
  userId: authResult.apiKey?.user_id,
  apiKeyId: authResult.apiKey?.id,
  ipAddress,
  requestBody: { phone },
  responseBody: { success: true, exists: true },
});

return new Response(...);
```

---

## Dados Capturados por Chamada

| Campo | Descrição |
|-------|-----------|
| `method` | GET, POST, PUT, DELETE |
| `endpoint` | Caminho da função (ex: `/phone-validation`) |
| `status_code` | Código HTTP da resposta |
| `response_time_ms` | Tempo de processamento em milissegundos |
| `user_id` | ID do usuário dono da API key |
| `api_key_id` | ID da API key usada |
| `ip_address` | IP de origem da requisição |
| `request_body` | Corpo da requisição (sanitizado) |
| `response_body` | Corpo da resposta (resumido) |
| `error_message` | Mensagem de erro, se houver |

---

## Considerações de Segurança

1. **Não logar dados sensíveis** - Omitir tokens e senhas do request_body
2. **Truncar payloads grandes** - Limitar tamanho do response_body
3. **Usar service role** - O insert é feito com a service role key para garantir permissão

---

## Resultado Esperado

Após a implementação:
- Cada chamada às Edge Functions será registrada na tabela `api_logs`
- A página de Logs mostrará dados reais na aba "Logs da API"
- Os logs serão automaticamente limpos após 72 horas pela função `cleanup-logs`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Adicionar logging de API |
| `supabase/functions/message-content/index.ts` | Adicionar logging de API |
| `supabase/functions/validate-api-key/index.ts` | Adicionar logging de API |

