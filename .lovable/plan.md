

# Fix: queue-executor Must Process Existing "ready" Call Logs

## Root Cause

The `queue-executor` `processTick` function (line 221-239) only looks for new pending leads in `call_leads` and creates fresh `call_logs`. The bulk enqueue mutation sets existing `call_logs` to `ready` status, but the executor never queries `call_logs` -- so those enqueued calls are ignored.

## Solution

Modify `processTick` in `supabase/functions/queue-executor/index.ts` to check for existing `call_logs` with status `ready` BEFORE looking for new pending leads. If a ready call_log exists, dial it (assign operator, update status, fire webhook) instead of creating a new one.

## Changes

### File: `supabase/functions/queue-executor/index.ts`

In the `processTick` function, after finding an available operator (line 207), add a new step before the "Find next pending lead" block:

**New step 3a: Check for existing ready call_logs**
- Query `call_logs` where `campaign_id` matches and `call_status = 'ready'`, ordered by `scheduled_for ASC`, limit 1
- If found:
  - Assign the operator to that call_log (`operator_id`, `call_status = 'dialing'`, `started_at = now()`)
  - Update operator status to `on_call`
  - Update the associated lead status to `calling`
  - Fire the webhook (fetch from `webhook_configs` where `category = 'calls'`)
  - Update queue state (round-robin index, calls_made)
  - Return result
- If not found: fall through to existing "find next pending lead" logic (unchanged)

**Webhook dispatch logic** (new helper or inline):
- Query `webhook_configs` for active config with `category = 'calls'`
- Build payload with `action: "call.dial"`, call/campaign/lead/operator details
- POST to webhook URL
- Store `external_call_id` from response if available

### File: `src/hooks/useCallPanel.ts`

No changes needed -- the `bulkEnqueueMutation` already correctly sets `call_status = 'ready'` and triggers the tick.

## Flow After Fix

```text
Bulk Enqueue sets call_logs to "ready"
       |
       v
queue-executor tick runs
       |
       v
Step 3a: Found ready call_log? --YES--> Assign operator, fire webhook, return
       |
       NO
       v
Step 3b: Find pending lead (existing logic)
```

