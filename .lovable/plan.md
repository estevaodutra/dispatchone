
# Melhorar Visibilidade de Erros na Automacao de Dispatch

## Diagnostico

A analise mostra que:
1. A Edge Function `execute-dispatch-sequence` funciona (testada via curl com sucesso)
2. O fix de CORS foi aplicado e deployado
3. Nao ha registros de chamadas a Edge Function vindas do navegador do usuario
4. O ultimo clique no botao com action_id foi as 14:40 UTC, ANTES do fix de CORS (19:25 UTC)
5. Quando a automacao falha, o toast de erro pode ser sobreposto pelo toast de sucesso "Acao registrada"

## Problema Principal

O toast de sucesso "Acao registrada" (em `onSuccess`) sempre aparece DEPOIS do toast de erro da automacao (em `mutationFn`), escondendo a falha. O usuario ve "Acao registrada" e pensa que tudo funcionou.

## Solucao

### 1. Mover logica de automacao para ANTES do toast de sucesso e unificar feedback

No `useCallPanel.ts`, alterar o `registerActionMutation` para:
- Retornar o resultado da automacao do `mutationFn`
- No `onSuccess`, mostrar toast diferente dependendo do resultado da automacao
- Se automacao falhou: toast amarelo/destructive com mensagem clara
- Se automacao passou: toast de sucesso com confirmacao

### 2. Adicionar logs de console detalhados

Adicionar `console.log` nos pontos criticos:
- Antes de chamar `supabase.functions.invoke`
- Apos o retorno (sucesso ou erro)
- Quando `entry?.leadPhone` e falsy (condicao que pula a automacao)

### 3. Corrigir fluxo de feedback

Alterar `onSuccess` para verificar o retorno do `mutationFn`:

```typescript
mutationFn: async (...) => {
  // ... existing code ...
  let automationResult = null;
  try {
    // ... automation code ...
    automationResult = { success: true };
  } catch (err) {
    automationResult = { success: false, error: err.message };
  }
  return automationResult;
},
onSuccess: (result) => {
  queryClient.invalidateQueries(...);
  if (result && !result.success) {
    toast({ title: "Acao registrada", description: `Automacao falhou: ${result.error}`, variant: "destructive" });
  } else {
    toast({ title: "Acao registrada", description: "Automacao executada com sucesso." });
  }
}
```

## Detalhes Tecnicos

### Arquivo: `src/hooks/useCallPanel.ts`

**Mudanca 1** - Adicionar console.log antes da chamada da Edge Function (linha ~632):
```typescript
console.log("[CallPanel] Dispatch trigger:", { campaignType, sequenceId, leadPhone: entry?.leadPhone });
```

**Mudanca 2** - Retornar resultado da automacao do mutationFn e ajustar onSuccess para mostrar feedback correto.

**Mudanca 3** - Adicionar log quando a condicao `entry?.leadPhone` falhar:
```typescript
if (!entry?.leadPhone) {
  console.warn("[CallPanel] leadPhone nao encontrado para entry:", entry);
}
```

### Nenhuma mudanca na Edge Function
A Edge Function ja esta correta e testada.

## Validacao

Apos as mudancas:
1. Abrir o console do navegador (F12)
2. Ir ao Painel de Ligacoes
3. Registrar uma acao com sequencia de dispatch
4. Verificar no console se os logs aparecem
5. Verificar se a Edge Function e chamada
6. Verificar se o toast mostra o resultado correto
