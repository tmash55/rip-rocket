-- Add service role policy for job processing
-- This allows the job processor to read and update jobs for background processing

-- Policy to allow service role to select all jobs for processing
CREATE POLICY "jobs_service_select" ON public.jobs
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy to allow service role to update job status during processing
CREATE POLICY "jobs_service_update" ON public.jobs
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy to allow service role to insert job events
CREATE POLICY "job_events_service_insert" ON public.job_events
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Alternative: If service_role doesn't work, we can use a specific check
-- for the job processor endpoint by checking if there's no auth.uid() 
-- (meaning it's an internal service call)

-- Uncomment these if the service_role approach doesn't work:
/*
CREATE POLICY "jobs_processor_select" ON public.jobs
FOR SELECT 
USING (auth.uid() IS NULL OR profile_id = auth.uid());

CREATE POLICY "jobs_processor_update" ON public.jobs
FOR UPDATE 
USING (auth.uid() IS NULL OR profile_id = auth.uid());

CREATE POLICY "job_events_processor_insert" ON public.job_events
FOR INSERT 
WITH CHECK (auth.uid() IS NULL OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.profile_id = auth.uid()));
*/
