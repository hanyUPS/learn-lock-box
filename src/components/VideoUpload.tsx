import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Video, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete?: () => void;
}

const VideoUpload = ({ onUploadComplete }: VideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's a video file
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        // Auto-generate title from filename if not set
        if (!title) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
          setTitle(nameWithoutExtension);
        }
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and provide a title',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // First, create a video record
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          title,
          description,
          file_path: `videos/${Date.now()}-${selectedFile.name}`,
          status: 'processing'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Upload file to storage
      const filePath = `videos/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Update video record with final file path
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          file_path: filePath,
        })
        .eq('id', video.id);

      if (updateError) throw updateError;

      setUploadProgress(90);

      // Process video (update metadata, generate thumbnail, etc.)
      const { error: processError } = await supabase.functions.invoke('process-video-upload', {
        body: {
          videoId: video.id,
          title,
          description,
        },
      });

      if (processError) throw processError;

      setUploadProgress(100);

      toast({
        title: 'Upload successful',
        description: 'Video has been uploaded and is now available',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Trigger refresh of video list
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Video
        </CardTitle>
        <CardDescription>
          Upload new videos to the platform. Supported formats: MP4, MOV, AVI, WebM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="video-file">Video File</Label>
          <div className="flex items-center gap-4">
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                {selectedFile.name}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-title">Title *</Label>
          <Input
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-description">Description</Label>
          <Textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description (optional)"
            disabled={uploading}
            rows={3}
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !title || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Upload Process
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• File is uploaded to secure storage</li>
            <li>• Video metadata is automatically registered</li>
            <li>• Video becomes available to approved students</li>
            <li>• Thumbnail will be generated for previews</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUpload;