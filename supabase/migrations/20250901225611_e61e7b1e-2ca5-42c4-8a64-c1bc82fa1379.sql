-- Create storage policies for video access by students
-- Students should be able to access videos they have permission to view

-- Policy for students to access video files they can view
CREATE POLICY "Students can access videos they can view" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'videos' 
  AND EXISTS (
    SELECT 1 FROM videos v 
    WHERE v.file_path = name 
    AND v.status = 'ready' 
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.approved = true
    )
  )
);

-- Policy for admins to manage all video files
CREATE POLICY "Admins can manage all video files" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'videos' 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);