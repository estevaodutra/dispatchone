

# Plan: Fix "Ligar Agora" Not Sending Webhook

## Root Cause

The `dialNow` mutation in `src/hooks/useCallPanel.ts` (line 532) calls the external webhook URL directly via `fetch()` from the browser. External webhooks (like n8n) block cross-origin requests (CORS), so the call fails silently. The webhook is never actually sent.

Other webhook calls in the same file already use the `webhook-proxy` Edge Function (line 688) to route requests server-side, avoiding CORS entirely. `dialNow` is the only one that doesn't.

## Change

**File:** `src/hooks/useCallPanel.ts` — `dialNowMutation`

Replace the direct `fetch(webhookUrl, ...)` call (lines 531-563) with `supabase.functions.invoke("webhook-proxy", { body: { url: webhookUrl, payload } })`.

This matches the existing pattern already used by `registerActionMutation` in the same file.

### Before (broken):
```typescript
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

### After (fixed):
```typescript
const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
  body: { url: webhookUrl, payload },
});
if (proxyError) {
  throw new Error(`Falha ao acionar webhook: ${proxyError.message}`);
}
```

The response parsing for `external_call_id` will also be adapted since `webhook-proxy` returns the proxied response in its body.

