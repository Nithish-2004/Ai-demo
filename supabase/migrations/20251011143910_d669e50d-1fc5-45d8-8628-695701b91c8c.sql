-- Create proctoring_logs table
CREATE TABLE public.proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_interview_id UUID NOT NULL REFERENCES public.mock_interviews(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  details TEXT,
  evidence_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add integrity_status to mock_interviews
ALTER TABLE public.mock_interviews 
ADD COLUMN integrity_status TEXT NOT NULL DEFAULT 'Passed' CHECK (integrity_status IN ('Passed', 'Failed - Malpractice'));

-- Add integrity fields to analysis_results
ALTER TABLE public.analysis_results
ADD COLUMN integrity_score NUMERIC,
ADD COLUMN malpractice_flags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN integrity_evidence JSONB DEFAULT '[]'::jsonb;

-- Enable RLS on proctoring_logs
ALTER TABLE public.proctoring_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for proctoring_logs
CREATE POLICY "Users can view own proctoring logs"
ON public.proctoring_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mock_interviews
    WHERE mock_interviews.id = proctoring_logs.mock_interview_id
    AND mock_interviews.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own proctoring logs"
ON public.proctoring_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mock_interviews
    WHERE mock_interviews.id = proctoring_logs.mock_interview_id
    AND mock_interviews.user_id = auth.uid()
  )
);

-- Enable realtime for proctoring_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.proctoring_logs;

-- Create index for faster queries
CREATE INDEX idx_proctoring_logs_mock_interview ON public.proctoring_logs(mock_interview_id, timestamp);