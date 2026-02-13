

# Confirmar Disparo Somente Apos Resposta do Webhook

## Diagnostico

A Edge Function `execute-dispatch-sequence` esta deployada e funcionando, mas nao ha logs de execucao recente. Isso indica que a chamada do cliente (`supabase.functions.invoke`) esta falhando silenciosamente -- o erro e capturado pelo `try/catch` generico em `executeActionAutomation` e apenas logado no console sem feedback ao usuario.

Alem disso, o fluxo atual da Edge Function ja aguarda a resposta do webhook antes de logar como "sent" ou "failed". O problema principal esta no lado do cliente.

## Mudancas

### 1. `src/hooks/useCallLeads.ts` - Melhorar `executeActionAutomation`

Adicionar verificacao da resposta do `supabase.functions.invoke` e propagar erros para que o usuario receba feedback visual (toast) quando a automacao falha:

- Verificar `data.error` ou `error` retornados pelo invoke
- Lancar erro se a invocacao falhou, para que o toast de erro seja exibido
- Adicionar log mais detalhado para debugging

### 2. `src/hooks/useCallLeads.ts` - Melhorar `completeLeadMutation`

Atualmente, `executeActionAutomation` e chamada com `await` mas erros sao engolidos silenciosamente. Mudar para:

- Separar o resultado da ligacao (que ja foi salvo) do resultado da automacao
- Se a automacao falhar, mostrar toast de aviso ("Ligacao registrada, mas a automacao falhou") em vez de silenciar
- Garantir que a ligacao nao e bloqueada por falha na automacao

### 3. `supabase/functions/execute-dispatch-sequence/index.ts` - Confirmar via webhook

Adicionar confirmacao explicita: a Edge Function so retornara `success: true` se o webhook respondeu com sucesso (HTTP 2xx). Se o webhook falhou:

- Logar como "failed" em ambas tabelas (ja implementado)
- Retornar `success: false` com detalhes do erro no response body
- O cliente podera verificar esse resultado e informar o usuario

### Detalhes tecnicos

```text
Fluxo atual:
  Cliente -> invoke(execute-dispatch-sequence) -> [erro silencioso] -> nada acontece

Fluxo corrigido:
  Cliente -> invoke(execute-dispatch-sequence) -> verifica resposta
    -> Se sucesso: toast "Sequencia disparada com sucesso"
    -> Se erro: toast "Falha ao disparar sequencia: [detalhe]"
```

Na funcao `executeActionAutomation`, a mudanca sera:

```text
case "start_sequence" (dispatch):
  1. Buscar lead
  2. Invocar execute-dispatch-sequence
  3. Verificar response.data e response.error
  4. Se falhou, lancar Error com detalhes
```

No `completeLeadMutation`:

```text
  1. Salvar resultado da ligacao (ja funciona)
  2. Tentar executar automacao
  3. Se automacao falhou, nao falhar a mutacao inteira
     - Mostrar toast de aviso separado
```

