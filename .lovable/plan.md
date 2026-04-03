

## Plan: Allow re-execution of poll actions after bug fix

### Problem
The `handle-poll-response` function has a deduplication check (line 133-150) that sees `action_executed = true` from the previous buggy execution (which added leads to the wrong list). Even after fixing `add_to_list` to use the correct `listId`, existing respondents are permanently blocked.

### Changes

#### 1. Database fix — Reset affected poll_response records
Run a migration to reset `action_executed` to `false` for poll responses whose action was `add_to_list`, so they can be re-processed with the corrected logic.

```sql
UPDATE poll_responses 
SET action_executed = false, 
    action_result = jsonb_build_object('reset_reason', 'add_to_list_fix', 'reset_at', now()),
    executed_at = NULL
WHERE action_type = 'add_to_list' 
  AND action_executed = true;
```

#### 2. Clean up wrongly added leads from the wrong list
Remove leads that were incorrectly added to the `group_leave` list by the old buggy code (leads with `origin_event = 'poll_response'` in a list that only monitors `group_leave`).

```sql
DELETE FROM group_execution_leads gel
USING group_execution_lists gelist
WHERE gel.list_id = gelist.id
  AND gel.origin_event = 'poll_response'
  AND NOT ('poll_response' = ANY(gelist.monitored_events));
```

### Files
- Database migration only (2 SQL statements)

### Result
After the migration, the next poll_response webhook for these respondents will pass the dedup check and execute `add_to_list` using the correct `listId` from the config.

