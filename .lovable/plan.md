

# Plan: Fix Script Not Loading (Duplicate Script Issue)

## Root Cause

The `useCallScript` hook uses `.maybeSingle()` to fetch the script. The database now has **2 scripts** for campaign `f78dc789`:

1. Original script (created by admin `3b6be6fe`) — has the full roteiro with questions
2. Duplicate empty script (created by operator `7848b4ff`) — auto-created when the operator couldn't see the first one (before RLS fix)

After the RLS fix, both scripts are now visible. `.maybeSingle()` throws an error when it finds 2 rows, causing the infinite loading spinner.

## Changes

### 1. Database cleanup (migration)
Delete duplicate/empty scripts — keep only the oldest (original) script per campaign:

```sql
DELETE FROM public.call_scripts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY created_at ASC) as rn
    FROM public.call_scripts
  ) sub
  WHERE rn > 1
);
```

Also add a UNIQUE constraint on `campaign_id` to prevent future duplicates.

### 2. Fix `src/hooks/useCallScript.ts`
Change `.maybeSingle()` to `.order("created_at", { ascending: true }).limit(1).maybeSingle()` so even if duplicates somehow exist, it picks the oldest one and doesn't error.

### 3. Fix auto-create logic
The hook's "create if none exists" logic should NOT create a new script if the user isn't the campaign owner. Change to only create for the admin/owner, not for operators viewing scripts.

