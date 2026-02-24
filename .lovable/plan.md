

# Plan: Fix "Ligar Agora" Webhook — Operator Can't Access Admin's Webhook Config

## Problem

The `webhook_configs` table has RLS policies that restrict SELECT to `user_id = auth.uid()`. When an operator clicks "Ligar Agora", the query on line 482 of `useCallPanel.ts` fetches `webhook_configs` where `category = 'calls'`, but RLS filters it to the operator's own configs — which don't exist. The operator never configured webhooks; only the admin did.

The "calls" category also has an empty `defaultUrl` in `webhook-categories.ts`, so there's no fallback either. Result: `webhookUrl` is `undefined`, the mutation exits early without dialing.

## Solution

Since the webhook is platform-wide (configured once by the admin, used by all company members), we need two changes:

### 1. Database: Add RLS policy so company members can read webhook configs of their company admin

A new SELECT policy on `webhook_configs` will allow a user to read configs belonging to any admin of a company they're a member of:

```sql
CREATE POLICY "Company members can read admin webhook_configs"
  ON public.webhook_configs FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm_admin
      JOIN public.company_members cm_me
        ON cm_admin.company_id = cm_me.company_id
      WHERE cm_admin.user_id = webhook_configs.user_id
        AND cm_admin.role = 'admin'
        AND cm_admin.is_active = true
        AND cm_me.user_id = auth.uid()
        AND cm_me.is_active = true
    )
  );
```

The existing `"Users can view own webhook_configs"` policy will be dropped since the new one covers it (includes `user_id = auth.uid()`).

### 2. Code: Update `dialNow` to query by campaign owner's user_id

**File:** `src/hooks/useCallPanel.ts` (lines 481-487)

Instead of a blind query filtered only by RLS, explicitly fetch the campaign's `user_id` (owner) and query `webhook_configs` for that owner:

```typescript
// Get campaign owner's user_id
const { data: campaignData } = await (supabase as any)
  .from("call_campaigns")
  .select("user_id")
  .eq("id", entry.campaignId)
  .single();

const campaignOwnerId = campaignData?.user_id;

// Fetch webhook config for "calls" category from campaign owner
const { data: webhookConfigs } = await (supabase as any)
  .from("webhook_configs")
  .select("*")
  .eq("user_id", campaignOwnerId)
  .eq("category", "calls")
  .eq("is_active", true)
  .limit(1);
```

This way, regardless of who clicks the button (admin or operator), it always resolves the webhook URL from the campaign owner's configuration. The new RLS policy allows the operator to read it.

### 3. Same fix in `queue-executor` Edge Function

The `queue-executor` Edge Function (line ~540) also queries `webhook_configs` for `calls`. It runs with the service role so RLS isn't an issue there, but the query should also explicitly use the campaign owner's `user_id` for correctness.

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Drop old SELECT policy, create new one allowing company members to read admin's configs |
| `src/hooks/useCallPanel.ts` | `dialNow` mutation: fetch campaign owner, query webhook_configs by owner's user_id |

