-- Create resumes table
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  parsed_data JSONB DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mock_interviews table
CREATE TABLE public.mock_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Mock Interview',
  status TEXT NOT NULL DEFAULT 'In Progress',
  questions JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add type column to interviews table
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Uploaded';

-- Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for resumes
CREATE POLICY "Users can view own resumes" ON public.resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" ON public.resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" ON public.resumes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for mock_interviews
CREATE POLICY "Users can view own mock interviews" ON public.mock_interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock interviews" ON public.mock_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock interviews" ON public.mock_interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock interviews" ON public.mock_interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Add fluency and nervousness scores to analysis_results
ALTER TABLE public.analysis_results 
ADD COLUMN IF NOT EXISTS fluency_score NUMERIC,
ADD COLUMN IF NOT EXISTS nervousness_score NUMERIC,
ADD COLUMN IF NOT EXISTS per_question_analysis JSONB DEFAULT '[]'::jsonb;