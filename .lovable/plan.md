

# Plan: Add "Open Lead Card" Button to CallPopup

## What Changes

Add a button inside the lead info card in the expanded CallPopup that opens the CallActionDialog (the full lead panel). This button will appear during all active call states — dialing, ringing, and on_call — not just on_call as it is today.

## Technical Details

**File: `src/components/operator/CallPopup.tsx`**

1. Import `ExternalLink` icon from lucide-react.
2. In the lead info card (lines 120-135), add a clickable button next to the lead name/avatar row that opens `setShowCallDialog(true)`.
3. Move the `CallActionDialog` render (currently gated to `on_call` only at line 218) so it's available for all active states (dialing, ringing, on_call).
4. Remove the existing "Abrir Painel" button that only shows during `on_call` (line 176) since the new button in the lead card replaces it.

The button will be a small ghost icon button placed at the right side of the lead name row, using the `ExternalLink` icon, so operators can open the full lead card at any point during the call lifecycle.

