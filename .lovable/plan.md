

# Fix: Bulk Enqueue Must Reset Operators and Handle Queue State

## Root Cause

Two interrelated issues prevent execution:

1. **Operators stuck as `on_call`**: The `bulkEnqueueMutation` resets `operator_id = null` on call_logs but does NOT reset the operators themselves. Both operators ("Estevao" and "Mauro") remain `on_call` with `current_call_id` pointing to the very call_logs that were just set to `ready`.

2. **Queue state immediately reverts**: The mutation sets `queue_execution_state.status = 'running'`, then triggers the tick. The tick finds zero available operators (all `on_call`), and immediately sets the status back to `waiting_operator` -- so nothing happens.

## Solution

### File: `src/hooks/useCallPanel.ts` -- `bulkEnqueueMutation`

Before setting call_logs to `ready`, reset any operators that are currently assigned to these calls:

1. For each call being enqueued, find operators where `current_call_id` matches one of the selected call IDs
2. Reset those operators: `status = 'available'`, `current_call_id = null`, `current_campaign_id = null`
3. Then proceed with the existing logic (set call_logs to `ready`, ensure queue state is `running`, trigger tick)

### File: `supabase/functions/queue-executor/index.ts` -- `processTick`

Add a safety measure: when the tick finds `ready` call_logs exist but no operators are available, it should NOT immediately give up. Instead:

- If `queue_execution_state.status` was just set to `running` by the enqueue, keep it as `running` (not `waiting_operator`) so the next client-side polling can retry the tick
- Alternatively, the tick should check if operators tied to `ready` call_logs (operator_id = null) might need their previous state cleared

## Technical Details

### Change 1: `src/hooks/useCallPanel.ts` (line ~283-288)

Add operator reset before updating call_logs:

```typescript
// Reset operators currently assigned to these calls
const { data: affectedOps } = await supabase
  .from("call_operators")
  .select("id")
  .in("current_call_id", ids);

if (affectedOps?.length) {
  await supabase
    .from("call_operators")
    .update({ status: "available", current_call_id: null, current_campaign_id: null })
    .in("id", affectedOps.map(o => o.id));
}
```

### Change 2: `supabase/functions/queue-executor/index.ts`

In the `processTick` function, when checking for ready call_logs (step 3a), if a ready call is found but operators are stuck, reset any operator whose `current_call_id` matches a ready call_log before looking for available operators. This makes the tick self-healing.

Add before the operator search (around the cooldown transition block):

```typescript
// Reset operators stuck on ready call_logs (from bulk enqueue)
const { data: stuckOps } = await supabase
  .from('call_operators')
  .select('id, current_call_id')
  .eq('user_id', userId)
  .eq('status', 'on_call')
  .eq('is_active', true);

if (stuckOps) {
  for (const op of stuckOps) {
    if (op.current_call_id) {
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('call_status')
        .eq('id', op.current_call_id)
        .maybeSingle();
      // If the call they're "on" is actually ready/cancelled/completed, free them
      if (!callLog || ['ready', 'cancelled', 'completed', 'failed', 'no_answer', 'busy'].includes(callLog.call_status)) {
        await supabase
          .from('call_operators')
          .update({ status: 'available', current_call_id: null, current_campaign_id: null })
          .eq('id', op.id);
      }
    }
  }
}
```

## Expected Flow After Fix

```text
User clicks "Discar em Massa" with 2 calls selected
       |
       v
bulkEnqueueMutation runs:
  1. Reset operators tied to selected calls -> available
  2. Set call_logs to "ready"
  3. Set queue_execution_state to "running"
  4. Trigger tick
       |
       v
queue-executor tick:
  1. Check stuck operators (self-healing) -> free any on finished calls
  2. Transition cooldown operators
  3. Find available operator (now exists!)
  4. Find ready call_log
  5. Assign operator, fire webhook
  6. Return success
```

