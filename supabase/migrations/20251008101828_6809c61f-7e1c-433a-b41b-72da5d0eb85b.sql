-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled Interview' NOT NULL,
  video_url TEXT NOT NULL,
  status TEXT DEFAULT 'Processing' NOT NULL CHECK (status IN ('Processing', 'Completed', 'Failed')),
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Interview policies
CREATE POLICY "Users can view own interviews"
  ON public.interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews"
  ON public.interviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviews"
  ON public.interviews FOR DELETE
  USING (auth.uid() = user_id);

-- Create analysis_results table
CREATE TABLE public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE UNIQUE,
  transcript TEXT,
  communication_score NUMERIC(3,1),
  technical_score NUMERIC(3,1),
  confidence_score NUMERIC(3,1),
  eye_contact_percentage NUMERIC(3,1),
  emotion_happy NUMERIC(3,1),
  emotion_neutral NUMERIC(3,1),
  emotion_nervous NUMERIC(3,1),
  words_per_minute NUMERIC(5,1),
  filler_word_count INTEGER,
  tone TEXT,
  keywords TEXT[],
  sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Analysis results policies
CREATE POLICY "Users can view own analysis results"
  ON public.analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = analysis_results.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own analysis results"
  ON public.analysis_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = analysis_results.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();