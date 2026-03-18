

## Fix: `body.photo` causing false `image_message` classification

### Root Cause

In the Z-API payload, `body.photo` is the **sender's profile photo URL** (e.g., `https://pps.whatsapp.net/...`), NOT an image message attachment. The current classification logic checks `hasPhotoUrl = bodyPhoto && bodyPhoto.startsWith("https://")` as part of image detection, which runs BEFORE the `pollVote` check.

This means any event with a sender profile photo (most events) gets classified as `image_message` instead of its actual type (poll_response, text_message, etc.).

### Fix

Remove `body.photo` / `hasPhotoUrl` from the image detection block in **both** files:
- `supabase/functions/webhook-inbound/index.ts` (lines 80-94)
- `supabase/functions/reclassify-events/index.ts` (same logic)

The image detection should only check `body.image`, `body.imageUrl`, `rawEvent.imageUrl`, and `mimeType`. Profile photos (`body.photo`, `senderPhoto`) are metadata, not message content.

### After Fix

Run "Reclassify All" to re-process existing events that were wrongly tagged as `image_message`.

### Files

| File | Change |
|------|--------|
| `supabase/functions/webhook-inbound/index.ts` | Remove `hasPhotoUrl` from image detection |
| `supabase/functions/reclassify-events/index.ts` | Same fix (duplicated logic) |

