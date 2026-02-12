

# Fix: Continuous Tick Polling for Bulk Enqueue

## Problem

After bulk enqueue, only a single `tick` is sent to the `queue-executor`. The first call processes correctly, but when it finishes and the operator becomes available again, no subsequent `tick` is ever triggered -- so the remaining `ready` calls sit idle.

## Solution

Add a polling mechanism in `useCallPanel.ts` that continuously triggers `tick` while there are remaining `ready` call_logs for any campaign with a `running` queue state. This mirrors how the `QueueControlPanel` works for campaign-specific queue execution.

## Changes

### File: `src/hooks/useCallPanel.ts`

Add a `useEffect` polling loop that:

1. Runs every 10 seconds (configurable)
2. Checks if there are any `call_logs` with `call_status = 'ready'`
3. If found, groups them by `campaign_id` and triggers a `tick` for each campaign
4. Stops polling when no more `ready` calls exist

```typescript
// After bulkEnqueueMutation definition, add:
const [bulkPollingActive, setBulkPollingActive] = useState(false);

// Activate polling when bulk enqueue succeeds
// In bulkEnqueueMutation.onSuccess: setBulkPollingActive(true);

useEffect(() => {
  if (!bulkPollingActive) return;

  const interval = setInterval(async () => {
    // Check for remaining ready call_logs
    const { data: readyCalls } = await supabase
      .from("call_logs")
      .select("id, campaign_id")
      .eq("call_status", "ready");

    if (!readyCalls?.length) {
      setBulkPollingActive(false); // No more ready calls, stop polling
      return;
    }

    // Get unique campaign IDs
    const campaignIds = [...new Set(readyCalls.map(c => c.campaign_id))];
    
    for (const campaignId of campaignIds) {
      try {
        await supabase.functions.invoke(
          `queue-executor?campaign_id=${campaignId}&action=tick`
        );
      } catch { /* ignore */ }
    }
  }, 10000); // Every 10 seconds

  return () => clearInterval(interval);
}, [bulkPollingActive]);
```

### File: `src/pages/CallPanel.tsx`

No changes needed -- the hook handles everything internally.

### No edge function changes

The `queue-executor` already handles multiple `ready` calls correctly via the step 3a logic.

## Expected Flow

```text
Bulk enqueue -> 1st tick fires -> 1st call dials
       |
       v
  Polling starts (every 10s)
       |
       v
  10s later: check ready calls -> found 1 remaining
       |
       v
  Trigger tick -> operator available? -> 2nd call dials
       |
       v
  10s later: check ready calls -> none remaining
       |
       v
  Polling stops
```
