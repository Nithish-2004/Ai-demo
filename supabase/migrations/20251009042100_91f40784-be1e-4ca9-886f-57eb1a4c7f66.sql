-- Create storage buckets for resumes and mock interview recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf']),
  ('mock-recordings', 'mock-recordings', false, 104857600, ARRAY['video/webm', 'video/mp4']);

-- RLS policies for resumes bucket
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for mock-recordings bucket
CREATE POLICY "Users can upload their own mock recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mock-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own mock recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mock-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own mock recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mock-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);