-- Add service role policy for job_events (missing from previous fix)
CREATE POLICY "job_events_service_insert" ON public.job_events
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "job_events_service_select" ON public.job_events
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');
