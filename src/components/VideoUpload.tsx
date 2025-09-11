import { useState, useRef } from 'react';
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
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [localDuration, setLocalDuration] = useState<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
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
        // Try to read duration locally for later DB update
        try {
          const url = URL.createObjectURL(file);
          const tempVideo = document.createElement('video');
          tempVideo.preload = 'metadata';
          tempVideo.src = url;
          tempVideo.onloadedmetadata = () => {
            const dur = Math.round(tempVideo.duration || 0);
            setLocalDuration(dur > 0 ? dur : null);
            URL.revokeObjectURL(url);
          };
          tempVideo.onerror = () => {
            setLocalDuration(null);
            URL.revokeObjectURL(url);
          };
        } catch (e) {
          setLocalDuration(null);
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
    if (!title || (uploadType === 'file' && !selectedFile) || (uploadType === 'url' && !videoUrl)) {
      toast({
        title: 'معلومات مفقودة',
        description: uploadType === 'file' ? 'يرجى اختيار ملف وإدخال العنوان' : 'يرجى إدخال رابط الفيديو والعنوان',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    // Start simulated progress up to 80% while uploading (fetch has no upload progress in browsers)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = window.setInterval(() => {
      setUploadProgress((prev) => (prev < 80 ? prev + 1 : 80));
    }, 400);

    try {
      let videoRecord: any;
      
      if (uploadType === 'file') {
        // File upload process
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            title,
            description,
            file_path: `videos/${Date.now()}-${selectedFile!.name}`,
            video_type: 'file',
            status: 'processing'
          })
          .select()
          .single();

        if (videoError) throw videoError;
        videoRecord = video;

        // Upload file to storage
        const filePath = `videos/${Date.now()}-${selectedFile!.name}`;
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, selectedFile!, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Reached after upload completes successfully
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setUploadProgress(85);

        // Update video record with final file path and duration (if known)
        const updateData: { file_path: string; duration_seconds?: number } = { file_path: filePath };
        if (localDuration && localDuration > 0) {
          updateData.duration_seconds = localDuration;
        }

        const { error: updateError } = await supabase
          .from('videos')
          .update(updateData)
          .eq('id', videoRecord.id);

        if (updateError) throw updateError;
      } else {
        // URL upload process
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            title,
            description,
            video_url: videoUrl,
            video_type: 'url',
            status: 'ready' // URL videos are immediately ready
          })
          .select()
          .single();

        if (videoError) throw videoError;
        videoRecord = video;
        setUploadProgress(85);
      }

      setUploadProgress(90);

      // Process video only for file uploads
      if (uploadType === 'file') {
        const { error: processError } = await supabase.functions.invoke('process-video-upload', {
          body: {
            videoId: videoRecord?.id,
            title,
            description,
          },
        });

        if (processError) throw processError;
      }

      setUploadProgress(100);

      toast({
        title: 'تم الرفع بنجاح',
        description: 'تم رفع الفيديو وهو متاح الآن',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setVideoUrl('');
      setLocalDuration(null);
      setUploadProgress(0);
      
      // Trigger refresh of video list
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'فشل الرفع',
        description: error.message || 'حدث خطأ أثناء الرفع',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          رفع فيديو
        </CardTitle>
        <CardDescription>
          رفع فيديوهات جديدة للمنصة. الصيغ المدعومة: MP4, MOV, AVI, WebM أو رابط خارجي
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={uploadType === 'file' ? 'default' : 'outline'}
              onClick={() => setUploadType('file')}
              disabled={uploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              رفع ملف
            </Button>
            <Button
              variant={uploadType === 'url' ? 'default' : 'outline'}
              onClick={() => setUploadType('url')}
              disabled={uploading}
              className="flex-1"
            >
              <Video className="h-4 w-4 mr-2" />
              رابط خارجي
            </Button>
          </div>

          {uploadType === 'file' ? (
            <div className="space-y-2">
              <Label htmlFor="video-file">ملف الفيديو</Label>
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="video-url">رابط الفيديو</Label>
              <Input
                id="video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                disabled={uploading}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-title">العنوان *</Label>
          <Input
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="أدخل عنوان الفيديو"
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-description">الوصف</Label>
          <Textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="أدخل وصف الفيديو (اختياري)"
            disabled={uploading}
            rows={3}
          />
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{uploadType === 'file' ? 'جاري الرفع...' : 'جاري الحفظ...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={(!selectedFile && uploadType === 'file') || (!videoUrl && uploadType === 'url') || !title || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {uploadType === 'file' ? 'جاري الرفع...' : 'جاري الحفظ...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {uploadType === 'file' ? 'رفع الفيديو' : 'حفظ الرابط'}
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            عملية الرفع
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• يتم رفع الملف أو حفظ الرابط بشكل آمن</li>
            <li>• يتم تسجيل بيانات الفيديو تلقائياً</li>
            <li>• يصبح الفيديو متاحاً للطلاب المعتمدين</li>
            <li>• سيتم إنشاء صورة مصغرة للمعاينة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUpload;