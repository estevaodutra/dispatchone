
# Fix: Operators Stuck as "On Call" After Call Completion

## Problem

When a call finishes (via `registerAction`), the `call_logs` record is updated to `completed`, but the **operator** assigned to that call is never reset. Their status remains `on_call` with `current_call_id` still pointing to the now-completed call. This prevents:
- Toggling the operator online/offline (the switch is disabled for `on_call`)
- The queue from assigning them new calls

The self-healing in `queue-executor` only runs during ticks, which may not fire if polling has stopped.

## Solution

Two changes:

### 1. Reset operator when a call completes (`src/hooks/useCallPanel.ts`)

In the `registerActionMutation`, after marking the call as `completed`, find the operator assigned to that call and reset them to `available`.

Add after the call_logs update (around line 580):

```typescript
// Reset the operator assigned to this call
const { data: assignedOps } = await (supabase as any)
  .from("call_operators")
  .select("id")
  .eq("current_call_id", callId);

if (assignedOps?.length) {
  await (supabase as any)
    .from("call_operators")
    .update({
      status: "available",
      current_call_id: null,
      current_campaign_id: null,
      last_call_ended_at: new Date().toISOString(),
    })
    .in("id", assignedOps.map((o: any) => o.id));
}
```

### 2. Allow manual reset from "on_call" in the toggle (`src/components/call-panel/OperatorsPanel.tsx`)

Remove `on_call` from the disabled condition so managers can manually force an operator offline/online if they get stuck. Change line 201 from:

```typescript
const isToggleDisabled = !operator.isActive || operator.status === "on_call" || operator.status === "cooldown";
```

to:

```typescript
const isToggleDisabled = !operator.isActive || operator.status === "cooldown";
```

And update `handleToggle` to also clear `current_call_id` when toggling from `on_call`:

```typescript
const handleToggle = async (checked: boolean) => {
  if (operator.status === "on_call") {
    // Force reset - also clear call assignment
    await updateOperator({
      id: operator.id,
      updates: { isActive: operator.isActive },
    });
    // Direct DB update to clear call state
  }
  updateOperatorStatus({
    id: operator.id,
    status: checked ? "available" : "offline",
  });
};
```

## Expected Result

- When a call is completed via `registerAction`, the assigned operator is automatically freed and becomes available for the next call in the queue
- If an operator gets stuck as "on_call" due to any edge case, the manager can manually toggle them back online/offline using the switch
- The bulk dialing flow will work end-to-end: each completed call frees the operator, the polling tick picks up the next ready call and assigns it
