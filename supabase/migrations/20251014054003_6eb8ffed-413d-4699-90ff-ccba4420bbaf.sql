-- Add violation tracking to mock_interviews table
ALTER TABLE mock_interviews 
ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violation_limit INTEGER DEFAULT 5;

-- Add violation increment field to proctoring_logs
ALTER TABLE proctoring_logs 
ADD COLUMN IF NOT EXISTS violation_increment INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mock_interviews_violation_count 
ON mock_interviews(violation_count);

-- Add comment to describe the violation system
COMMENT ON COLUMN mock_interviews.violation_count IS 'Cumulative count of violations across all types during the interview session';
COMMENT ON COLUMN mock_interviews.violation_limit IS 'Maximum allowed violations before automatic termination (default: 5)';
COMMENT ON COLUMN proctoring_logs.violation_increment IS 'Number of violations added by this event (typically 1, or 2 for severe violations)';
COMMENT ON COLUMN proctoring_logs.current_count IS 'Snapshot of total violation count at the time of this event';