
-- webhook_events: restrict to authenticated
DROP POLICY IF EXISTS "Users can view own webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Users can create own webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Users can update own webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Users can delete own webhook_events" ON public.webhook_events;

CREATE POLICY "Users can view own webhook_events" ON public.webhook_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own webhook_events" ON public.webhook_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own webhook_events" ON public.webhook_events
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own webhook_events" ON public.webhook_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- call_logs: restrict to authenticated
DROP POLICY IF EXISTS "Company members can select call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Company members can insert call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Company members can update call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Company members can delete call_logs" ON public.call_logs;

CREATE POLICY "Company members can select call_logs" ON public.call_logs
  FOR SELECT TO authenticated
  USING (((company_id IS NOT NULL) AND is_company_member(company_id, auth.uid())) OR ((company_id IS NULL) AND (user_id = auth.uid())));
CREATE POLICY "Company members can insert call_logs" ON public.call_logs
  FOR INSERT TO authenticated
  WITH CHECK (((company_id IS NOT NULL) AND is_company_member(company_id, auth.uid())) OR ((company_id IS NULL) AND (user_id = auth.uid())));
CREATE POLICY "Company members can update call_logs" ON public.call_logs
  FOR UPDATE TO authenticated
  USING (((company_id IS NOT NULL) AND is_company_member(company_id, auth.uid())) OR ((company_id IS NULL) AND (user_id = auth.uid())));
CREATE POLICY "Company members can delete call_logs" ON public.call_logs
  FOR DELETE TO authenticated
  USING (((company_id IS NOT NULL) AND is_company_admin(company_id, auth.uid())) OR ((company_id IS NULL) AND (user_id = auth.uid())));

-- group_campaigns: restrict to authenticated
DROP POLICY IF EXISTS "Users can view own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can create own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can update own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can delete own group_campaigns" ON public.group_campaigns;

CREATE POLICY "Users can view own group_campaigns" ON public.group_campaigns
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_campaigns" ON public.group_campaigns
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_campaigns" ON public.group_campaigns
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own group_campaigns" ON public.group_campaigns
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Restrict service-role catch-all policies to service_role only
DROP POLICY IF EXISTS "Service role can manage all sequence_executions" ON public.sequence_executions;
CREATE POLICY "Service role can manage all sequence_executions" ON public.sequence_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage all scheduled_sequence_executions" ON public.scheduled_sequence_executions;
CREATE POLICY "Service role can manage all scheduled_sequence_executions" ON public.scheduled_sequence_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on group_execution_lists" ON public.group_execution_lists;
CREATE POLICY "Service role full access on group_execution_lists" ON public.group_execution_lists
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on group_execution_leads" ON public.group_execution_leads;
CREATE POLICY "Service role full access on group_execution_leads" ON public.group_execution_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
