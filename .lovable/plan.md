

## Plano: Aguardar resposta do webhook no "Executar agora"

### Problema
O handler `handleExecuteNode` dispara a Edge Function mas só verifica se houve erro de invocação (`error` do Supabase SDK). Não analisa o `data` retornado, que contém o resultado real da execução (sucesso/falha do webhook). Assim, mesmo que o webhook falhe, o usuário vê "Mensagem disparada com sucesso!".

### Correção

**Arquivo: `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**

Alterar `handleExecuteNode` para:
1. Verificar `data.error` ou `data.success === false` retornado pela Edge Function
2. Verificar `data.nodesFailed > 0` para execuções parciais
3. Exibir toast adequado baseado no resultado real

```typescript
const handleExecuteNode = async (node: LocalNode) => {
  try {
    toast.info("Executando...");
    const { data, error } = await supabase.functions.invoke("execute-message", {
      body: { campaignId: sequence.groupCampaignId, sequenceId: sequence.id, manualNodeIndex: node.nodeOrder },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (data?.success === false) throw new Error("Webhook retornou erro");
    
    const failedCount = data?.nodesFailed || 0;
    if (failedCount > 0) {
      toast.warning(`Executado com ${failedCount} falha(s)`);
    } else {
      toast.success("Mensagem executada com sucesso!");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao executar mensagem";
    toast.error(msg);
  }
};
```

1 arquivo, ~10 linhas alteradas.

