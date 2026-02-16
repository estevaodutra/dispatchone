
# Corrigir: Acao de webhook nao dispara no Painel de Ligacoes

## Problema

O Painel de Ligacoes (`CallPanel.tsx`) usa `useCallPanel.ts` para registrar acoes. Dentro de `registerActionMutation` (linha 625), a logica de automacao **so trata o tipo `start_sequence`**:

```typescript
if (actionData?.action_type === "start_sequence" && actionData.action_config) {
  // ... apenas start_sequence
}
```

Os tipos `webhook`, `add_tag` e `update_status` sao completamente ignorados. Isso explica por que o webhook nunca e chamado e nenhum log aparece - a funcao `webhook-proxy` nunca e invocada.

Ja existe uma funcao `executeActionAutomation` em `useCallLeads.ts` que trata todos os tipos corretamente (incluindo webhook via `webhook-proxy`), mas `useCallPanel.ts` nao a utiliza.

## Solucao

### Arquivo: `src/hooks/useCallPanel.ts`

**Importar e reutilizar `executeActionAutomation` de `useCallLeads.ts`**... Porem essa funcao nao e exportada e depende do `supabase` importado diretamente. A melhor abordagem e extrair a funcao para um modulo utilitario ou simplesmente adicionar os cases faltantes diretamente no `registerActionMutation`.

A abordagem mais segura e adicionar os cases `webhook`, `add_tag` e `update_status` no bloco `try/catch` de automacao (linhas 616-679) do `registerActionMutation`, replicando a logica ja funcional do `useCallLeads.ts`.

**Mudanca - Expandir a logica de automacao (linhas 625-674):**

Apos o bloco `if (actionData?.action_type === "start_sequence")`, adicionar:

```typescript
// Webhook action
else if (actionData?.action_type === "webhook" && actionData.action_config?.url) {
  const url = actionData.action_config.url as string;
  const { data: leadData } = await (supabase as any)
    .from("call_leads")
    .select("*")
    .eq("id", entry?.leadId)
    .single();

  const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
    body: { url, payload: { lead: leadData, campaignId: entry?.campaignId, actionType: "webhook" } },
  });

  if (proxyError) {
    automationResult = { automationSuccess: false, automationError: `Webhook falhou: ${proxyError.message}` };
  }
}

// Add tag
else if (actionData?.action_type === "add_tag" && actionData.action_config?.tag && entry?.leadId) {
  const tag = actionData.action_config.tag as string;
  const { data: leadData } = await (supabase as any)
    .from("call_leads")
    .select("custom_fields")
    .eq("id", entry.leadId)
    .single();

  const currentFields = (leadData?.custom_fields as Record<string, unknown>) || {};
  const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];

  if (!currentTags.includes(tag)) {
    await (supabase as any)
      .from("call_leads")
      .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
      .eq("id", entry.leadId);
  }
}

// Update status (lead status already updated above as "completed",
// override with configured status)
else if (actionData?.action_type === "update_status" && actionData.action_config?.status && entry?.leadId) {
  const newStatus = String(actionData.action_config.status);
  await (supabase as any)
    .from("call_leads")
    .update({ status: newStatus })
    .eq("id", entry.leadId);

  // Also update call_log status if different from completed
  if (newStatus !== "completed") {
    await (supabase as any)
      .from("call_logs")
      .update({ call_status: newStatus })
      .eq("id", callId);
  }
}
```

## Resumo

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useCallPanel.ts` | Adicionar tratamento para acoes `webhook`, `add_tag` e `update_status` no `registerActionMutation`, usando `webhook-proxy` para disparos de webhook |

## Impacto

- Webhook sera disparado via `webhook-proxy` (server-side, sem CORS)
- Tags serao adicionadas ao lead
- Status customizado sera aplicado ao lead
- Erros serao reportados ao usuario via toast
