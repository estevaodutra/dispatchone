

# Fix: Map `not_found` Call Status to "Não Encontrada"

## Problem

When the call provider returns `not_found`, the UI displays a generic "Falha" label. The status should be displayed as "Não Encontrada" to give operators clear, actionable feedback.

## Technical Change

### File: `src/pages/CallPanel.tsx` (lines 254-256)

Update the status label mapping to include `not_found` and other granular statuses:

```typescript
const label = entry.callStatus === "no_answer" ? "N/Atendeu"
  : entry.callStatus === "busy" ? "Ocupado"
  : entry.callStatus === "not_found" ? "Não Encontrada"
  : entry.callStatus === "voicemail" ? "Caixa Postal"
  : entry.callStatus === "timeout" ? "Tempo Esgotado"
  : "Falha";
```

This adds explicit labels for `not_found`, `voicemail`, and `timeout` (matching the API docs status table), while keeping "Falha" as the fallback for truly generic errors.

