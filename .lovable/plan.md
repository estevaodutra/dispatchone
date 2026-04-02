

## Plano: Executar sequência webhook apenas uma vez (não por grupo)

### Problema
Quando o `trigger-sequence` é chamado sem um telefone no payload, o `triggerContext.sendPrivate` fica `false`. O `execute-message` então usa todos os grupos vinculados à campanha como destinos (linha 596), executando cada nó uma vez **por grupo**. Isso causa a repetição observada.

Para sequências webhook, o disparo deve acontecer **uma única vez**, não multiplicado pela quantidade de grupos.

### Solução
No `trigger-sequence/index.ts`, sempre definir `sendPrivate: true` para garantir que o `execute-message` use apenas um destino. Quando não houver telefone no payload, usar o `groupJid` do primeiro grupo vinculado como destino único (ou um destino "virtual").

**Abordagem mais limpa:** Adicionar um campo `singleExecution: true` no `triggerContext` e ajustar o `execute-message` para respeitar isso.

### Alterações

**1. `supabase/functions/trigger-sequence/index.ts`**
- Buscar o primeiro grupo da campanha para usar como destino padrão quando não houver telefone
- Definir `sendPrivate: true` sempre, usando o primeiro grupo como fallback de destino
- Isso garante que `execute-message` use apenas 1 destino em vez de iterar todos os grupos

```typescript
// Quando não tem telefone, buscar primeiro grupo como destino único
if (!destinationPhone) {
  const { data: firstGroup } = await supabase
    .from("campaign_groups")
    .select("group_jid, group_name")
    .eq("campaign_id", typedCampaign.id)
    .limit(1)
    .single();

  triggerContext.respondentJid = firstGroup?.group_jid || "";
  triggerContext.respondentName = firstGroup?.group_name || "";
  triggerContext.groupJid = firstGroup?.group_jid || "";
  triggerContext.sendPrivate = true; // forçar execução única
}
```

**2. `supabase/functions/execute-message/index.ts`** (opcional)
- Nenhuma alteração necessária se usarmos a abordagem acima — o `sendPrivate: true` já faz o `execute-message` usar apenas 1 destino

### Resultado
O webhook executa a sequência **1 vez** direcionada ao primeiro grupo vinculado, em vez de repetir para cada grupo.

1 arquivo alterado, ~15 linhas.

