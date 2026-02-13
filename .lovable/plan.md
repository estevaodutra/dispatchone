

# Corrigir erro ao executar sequencia de disparo sem etapas

## Problema identificado

A acao "Registrar" no Painel de Ligacoes chama a edge function `execute-dispatch-sequence`, mas as sequencias configuradas (como "A1" e "Tentei de Ligar") nao possuem etapas salvas na tabela `dispatch_sequence_steps` (ambas tem 0 steps). A edge function retorna HTTP 400 com `"No steps found for this sequence"`, e como o `useCallPanel` nao trata esse erro, o app inteiro quebra com o modal "Error: The app encountered an error".

A acao de registrar a ligacao **funciona** (o log e salvo, o lead e atualizado), mas o crash ocorre logo depois, na tentativa de executar a automacao.

## Solucao

### 1. Tratar erro da automacao sem quebrar o fluxo (useCallPanel.ts)

Envolver a chamada da automacao em um try/catch separado. Se a sequencia falhar (ex: sem etapas), exibir um aviso (toast) mas **nao** derrubar o app. A acao de registro ja foi salva com sucesso.

```typescript
// Dentro de registerActionMutation, apos salvar o log/lead:
try {
  const { data: actionData } = await ...;
  if (actionData?.action_type === "start_sequence" && actionData.action_config) {
    // ... invocar execute-dispatch-sequence
  }
} catch (automationError) {
  console.error("[CallPanel] Automation failed:", automationError);
  // Nao re-lanca o erro - o registro da acao ja foi salvo
}
```

### 2. Melhorar feedback ao usuario

Apos a chamada ao edge function, verificar o resultado. Se retornar erro, mostrar um toast de aviso:

```typescript
const { data: result, error: fnError } = await supabase.functions.invoke(...);
if (fnError || result?.error) {
  toast({ title: "Automacao nao executada", description: result?.error || "Sequencia sem etapas configuradas", variant: "destructive" });
}
```

## Arquivos modificados

1. **`src/hooks/useCallPanel.ts`** - Envolver bloco de automacao (linhas 617-657) em try/catch com toast de aviso

## Resultado esperado

- A acao "Registrar" salva o resultado normalmente
- Se a sequencia nao tiver etapas, aparece um aviso "Automacao nao executada - Sequencia sem etapas configuradas" em vez de crashar o app
- O usuario pode ir ate a campanha de disparos e adicionar etapas a sequencia

