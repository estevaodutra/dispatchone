

## Problem Analysis

When multiple leads arrive simultaneously via `call-dial`, the current code:
1. Tries to reserve an operator for each one (only succeeds for available operators)
2. **Calls the webhook for ALL leads**, even when no operator was reserved
3. If the webhook returns an `external_call_id`, it sets the call to `dialing` regardless of operator reservation
4. Result: all 197 leads show "Discando" even though there aren't enough operators

## Root Cause

In `call-dial/index.ts` (lines 583-631): the webhook is fired regardless of whether an operator was reserved. When the webhook returns an ID, the status is forced to `dialing` (line 614), bypassing the operator check.

## Plan

### Step 1: Fix `call-dial` — Only fire webhook when operator is reserved

Modify `call-dial/index.ts`:
- Move the webhook call inside the `if (reservedOperator)` block
- When no operator is available, keep the call as `scheduled` (queued) — the queue-executor will process it in order
- Add a **60-second timeout** on the webhook fetch using `AbortController`
- If webhook times out or fails: mark call as `failed` with notes "Falha no acionamento da ligação", release operator, revert lead to `pending` — the existing retry/reschedule system handles the rest

### Step 2: Fix `queue-executor` — Add timeout to webhook call

Modify `queue-executor/index.ts` `fireDialWebhook`:
- Add 60-second timeout on the webhook fetch
- On timeout: revert call to `failed` (not `ready`), release operator, revert lead to `pending`
- This triggers the existing reschedule-failed-calls cron to handle retries per campaign config

### Step 3: Update webhook error handling in `queue-executor`

Currently (line 588-589), on webhook failure the call stays as `dialing`. Change to:
- Mark call as `failed` with notes indicating the failure reason
- Release operator
- Revert lead to `pending`
- The pg_cron reschedule job will handle retries

## Technical Details

```text
BEFORE (broken):
  call-dial receives lead
  → tries reserve_operator (may fail)
  → ALWAYS calls webhook
  → webhook returns ID → forces "dialing"
  → all leads show "Discando"

AFTER (fixed):
  call-dial receives lead
  → tries reserve_operator
  → IF operator reserved:
      → call webhook (60s timeout)
      → IF webhook responds OK → "dialing" ✓
      → IF webhook timeout/fail → "failed" + release operator → retry rules
  → IF no operator:
      → stay "scheduled" → queue-executor processes in FIFO order
```

### Files Changed
- `supabase/functions/call-dial/index.ts` — Conditional webhook + timeout
- `supabase/functions/queue-executor/index.ts` — Timeout + proper failure handling in `fireDialWebhook`

