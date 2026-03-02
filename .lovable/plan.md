

## Fix: "Para o final" button not working

### Root Cause
The `sendToEndOfQueue` mutation always targets the `call_queue` table, but the queue list combines entries from two sources:
1. `call_queue` table (status "waiting")
2. `call_logs` table (status "ready")

When the entry comes from `call_logs`, the update to `call_queue` matches zero rows and silently succeeds without doing anything.

### Fix in `src/hooks/useCallQueuePanel.ts`

Update the `sendToEndOfQueue` mutation to check the entry's `status`:

- **If status is "waiting"** (from `call_queue`): update position in `call_queue` as current logic does, but also verify rows were affected.
- **If status is "ready"** (from `call_logs`): update `scheduled_for` to a far-future timestamp so it sorts last among ready entries, or simply skip with a toast saying it's not supported for this type.

Pass the entry `status` alongside `entryId` and `currentAttempts` in the mutation params.

### Changes

**`src/hooks/useCallQueuePanel.ts`**:
- Add `status` to mutation params type
- Branch logic: for "waiting" entries, update `call_queue.position`; for "ready" entries, update `call_logs.scheduled_for` to push it to the end
- Verify the update affected at least 1 row, throw if not

**`src/pages/CallPanel.tsx`**:
- Pass `entry.status` in the `onSendToEnd` call inside `QueueCard`

