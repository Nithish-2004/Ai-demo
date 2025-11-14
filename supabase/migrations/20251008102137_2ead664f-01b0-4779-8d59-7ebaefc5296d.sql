-- Create storage bucket for interview videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('interviews', 'interviews', true);

-- Storage policies for interview videos
CREATE POLICY "Users can upload their own interview videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'interviews' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own interview videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'interviews' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own interview videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'interviews' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );