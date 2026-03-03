

## Problema

A tela está em branco porque o **build do servidor de desenvolvimento está falhando** devido a 9 erros de TypeScript nas edge functions. Esses erros bloqueiam o carregamento de toda a aplicação.

Os erros são de dois tipos:
1. **`err`/`error` tipado como `unknown`** — Deno strict mode exige casting antes de acessar `.message`
2. **`supabaseAdmin.rpc ? undefined : undefined`** — condição sempre `true`, TS alerta como erro

## Correção

Corrigir os 6 arquivos de edge functions:

### 1. `supabase/functions/call-queue-api/index.ts`
- **Linha 121**: Remover a linha inútil `attempts: supabaseAdmin.rpc ? undefined : undefined`
- **Linha 136-137**: Trocar `err.message` por `(err as Error).message`

### 2. `supabase/functions/company-add-member/index.ts`
- **Linha 143**: Trocar `err.message` por `(err as Error).message`

### 3. `supabase/functions/leads-api/index.ts`
- **Linha 163**: Trocar `err.message` por `(err as Error).message`

### 4. `supabase/functions/queue-processor/index.ts`
- **Linha 100**: Trocar `err.message` por `(err as Error).message`

### 5. `supabase/functions/reschedule-failed-calls/index.ts`
- **Linha 199**: Trocar `e.message` por `(e as Error).message`
- **Linhas 217, 219**: Trocar `error.message` por `(error as Error).message`

### 6. `supabase/functions/webhook-proxy/index.ts`
- **Linha 93**: Trocar `error.message` por `(error as Error).message`

Total: 9 correções simples de casting que desbloqueiam o build e restauram a aplicação.

