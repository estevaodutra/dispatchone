
# Allow Redialing Failed Calls

## Problem

When a call has a failure status (`no_answer`, `busy`, `failed`), the UI does not show a "Discar agora" (dial now) button. Only `no_answer` shows a "Religar" (reschedule) button, while `busy` and `failed` only show "Ver detalhes". The user wants to be able to redial directly from any failed status.

## Solution

Add a green "Discar agora" (phone icon) button for all calls in the `failed` category, alongside the existing buttons. This will call `dialNow` which resets the call status and triggers the dialing flow.

## Technical Changes

### File: `src/pages/CallPanel.tsx` (lines 738-758)

Replace the current failed/cancelled action buttons with:

1. A green "Discar agora" button for ALL failed statuses (`no_answer`, `busy`, `failed`)
2. Keep the "Ver detalhes" button for cancelled and failed calls

```typescript
{category === "failed" && (
  <Button
    size="icon"
    className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
    onClick={() => dialNow(entry.id)}
    title="Ligar novamente"
  >
    <Phone className="h-3.5 w-3.5" />
  </Button>
)}
{(category === "cancelled" || category === "failed") && (
  <Button
    variant="outline"
    size="icon"
    className="h-7 w-7"
    onClick={() => openActionDialog(entry)}
    title="Ver detalhes"
  >
    <Eye className="h-3.5 w-3.5" />
  </Button>
)}
```

This removes the separate `no_answer`-only reschedule button (lines 749-758) and replaces it with a universal redial button for all failure types. The `dialNow` function already handles resetting the call status and triggering the webhook.
