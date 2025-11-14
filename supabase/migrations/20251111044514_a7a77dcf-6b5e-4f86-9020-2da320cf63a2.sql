-- Add verification and enhanced proctoring fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS face_embedding JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_id_url TEXT;

-- Add verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification logs"
  ON verification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification logs"
  ON verification_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add enhanced proctoring fields to mock_interviews
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS secondary_camera_enabled BOOLEAN DEFAULT false;
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS credibility_index NUMERIC DEFAULT 100;

-- Add detailed monitoring flags table
CREATE TABLE IF NOT EXISTS monitoring_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_interview_id UUID NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  details JSONB,
  evidence_url TEXT
);

ALTER TABLE monitoring_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monitoring flags"
  ON monitoring_flags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mock_interviews
    WHERE mock_interviews.id = monitoring_flags.mock_interview_id
    AND mock_interviews.user_id = auth.uid()
  ));

CREATE POLICY "System can insert monitoring flags"
  ON monitoring_flags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM mock_interviews
    WHERE mock_interviews.id = monitoring_flags.mock_interview_id
  ));

-- Add credibility scoring to analysis_results
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS credibility_index NUMERIC DEFAULT 100;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS verification_summary JSONB;

-- Create proctor sessions table for live monitoring
CREATE TABLE IF NOT EXISTS proctor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_interview_id UUID NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  proctor_user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  interventions JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

ALTER TABLE proctor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proctors can manage sessions"
  ON proctor_sessions FOR ALL
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_flags_interview_id ON monitoring_flags(mock_interview_id);
CREATE INDEX IF NOT EXISTS idx_proctor_sessions_interview_id ON proctor_sessions(mock_interview_id);