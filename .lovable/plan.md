

## Fix: Move pollVote detection to highest priority

### Problem
Events containing `body.pollVote` are not being classified as `poll_response` because the pollVote check runs after media detection. Even though `body.photo` was removed, other fields in the payload could still trigger earlier returns.

### Solution
Move the `pollVote` check to be the **first classification check** in `classifyZApiEvent()`, before any media detection, in both files:

**`supabase/functions/webhook-inbound/index.ts`**
- Move the pollVote block (lines ~145-156) to right after the `body` extraction (line 70), before media detection

**`supabase/functions/reclassify-events/index.ts`**
- Same change: move pollVote block to the top of the classification function

### Logic after fix
```
1. pollVote check  ← FIRST (if body.pollVote exists → poll_response)
2. media detection (image, video, audio, document, sticker)
3. notification check
4. direct event mapping
5. status checks
6. ...
```

### Files
| File | Change |
|------|--------|
| `supabase/functions/webhook-inbound/index.ts` | Move pollVote check to top |
| `supabase/functions/reclassify-events/index.ts` | Same |

