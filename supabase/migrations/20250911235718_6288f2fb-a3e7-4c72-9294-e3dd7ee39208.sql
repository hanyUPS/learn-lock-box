-- Add video_url column to support external video links
ALTER TABLE public.videos 
ADD COLUMN video_url TEXT,
ADD COLUMN video_type TEXT DEFAULT 'file' CHECK (video_type IN ('file', 'url'));

-- Make file_path nullable since URL videos won't have local files
ALTER TABLE public.videos 
ALTER COLUMN file_path DROP NOT NULL;