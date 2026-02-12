

# Fix: Subsequent Calls Not Dialing + Show Enqueued Calls in "Fila" Tab

## Problem 1: Subsequent calls never dial

After the first bulk-enqueued call is dialed, the operator goes to `on_call`. The 10-second polling fires a `tick`, but the queue-executor finds no available operator and changes `queue_execution_state.status` from `running` to `waiting_operator`. When the operator finishes the call and becomes available again, the next polling tick is rejected because `processTick` exits early when `state.status !== 'running'`.

**Fix**: The polling loop in `useCallPanel.ts` must reset `queue_execution_state.status` back to `running` before each tick when there are still `ready` call_logs. This ensures the executor always processes the tick instead of returning early.

## Problem 2: Enqueued calls don't appear in the "Fila" tab

The "Fila" tab reads from the `call_queue` table (leads with status `waiting`), but bulk enqueue marks `call_logs` with `call_status = 'ready'`. These are completely different tables, so enqueued calls are invisible in the queue tab.

**Fix**: Update `useCallQueuePanel.ts` to also fetch `call_logs` with `call_status = 'ready'` and merge them into the queue list. Update the "Fila" tab counter accordingly.

## Technical Changes

### 1. `src/hooks/useCallPanel.ts` -- Polling loop (lines 273-299)

Update the polling `useEffect` to reset `queue_execution_state.status = 'running'` for each campaign before triggering the tick:

```typescript
useEffect(() => {
  if (!bulkPollingActive) return;

  const interval = setInterval(async () => {
    const { data: readyCalls } = await supabase
      .from("call_logs")
      .select("id, campaign_id")
      .eq("call_status", "ready");

    if (!readyCalls?.length) {
      setBulkPollingActive(false);
      return;
    }

    const campaignIds = [...new Set(readyCalls.map(c => c.campaign_id).filter(Boolean))];

    for (const campaignId of campaignIds) {
      // Ensure queue state is "running" so the tick won't be rejected
      await supabase
        .from("queue_execution_state")
        .update({ status: "running" })
        .eq("campaign_id", campaignId);

      try {
        await supabase.functions.invoke(
          `queue-executor?campaign_id=${campaignId}&action=tick`
        );
      } catch { /* ignore */ }
    }
  }, 10000);

  return () => clearInterval(interval);
}, [bulkPollingActive]);
```

### 2. `src/hooks/useCallQueuePanel.ts` -- Merge ready call_logs into queue

Add a second query for `call_logs` where `call_status = 'ready'`, transform them into `QueuePanelEntry` format, and merge with the existing `call_queue` results:

```typescript
// Fetch ready call_logs (from bulk enqueue)
const { data: readyLogs } = await supabase
  .from("call_logs")
  .select("id, campaign_id, lead_id, created_at, call_campaigns(name), call_leads(name, phone)")
  .eq("call_status", "ready")
  .order("scheduled_for", { ascending: true });

// Map to QueuePanelEntry format and merge
const readyEntries = (readyLogs || []).map((log, idx) => ({
  id: log.id,
  campaignId: log.campaign_id,
  campaignName: log.call_campaigns?.name || null,
  leadId: log.lead_id,
  leadName: log.call_leads?.name || null,
  leadPhone: log.call_leads?.phone || null,
  leadEmail: null,
  position: 9000 + idx, // After regular queue entries
  attempts: 0,
  lastAttemptAt: null,
  lastResult: null,
  status: "ready",
  createdAt: log.created_at,
}));

return [...regularQueueEntries, ...readyEntries];
```

### 3. `src/pages/CallPanel.tsx` -- Update "Fila" counter

The `totalWaiting` count from `useCallQueuePanel` will now automatically include `ready` call_logs, so the tab badge `Fila ({totalWaiting})` updates without further changes.

## Expected Flow After Fix

```text
Bulk enqueue: call_logs set to "ready"
       |
       v
"Fila" tab shows enqueued calls immediately
       |
       v
1st tick: operator available -> dials 1st call
       |
       v
10s later: polling finds remaining "ready" calls
  -> resets queue_execution_state to "running"
  -> triggers tick
  -> operator still on_call -> self-healing checks
  -> no available operator -> returns "waiting"
       |
       v
User finishes call -> operator becomes "available"
       |
       v
10s later: polling finds remaining "ready" calls
  -> resets queue_execution_state to "running"
  -> triggers tick
  -> operator now available -> dials 2nd call
       |
       v
Repeat until no more "ready" calls -> polling stops
```
