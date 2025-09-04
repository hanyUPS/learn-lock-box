import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Play, Video, Clock, Pause, Square, SkipBack, SkipForward, Settings } from 'lucide-react';

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  file_path: string;
  status: 'processing' | 'ready' | 'disabled';
  duration_seconds: number | null;
  created_at: string;
}

const VideoPlayer = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!videoId) {
      navigate('/');
      return;
    }

    fetchVideo();
  }, [videoId, navigate]);

  const fetchVideo = async () => {
    if (!videoId) return;

    try {
      // Fetch video details
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('status', 'ready')
        .single();

      if (videoError) {
        throw new Error('Video not found or not available');
      }

      setVideo(videoData);

      // Get signed URL for video playback
      const { data: urlData, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(videoData.file_path, 3600); // 1 hour expiry

      if (urlError) {
        throw new Error('Failed to load video');
      }

      setVideoUrl(urlData.signedUrl);

    } catch (error: any) {
      console.error('Error fetching video:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحميل الفيديو',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'غير محدد';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleSeekBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleSeekForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const handleSpeedChange = () => {
    if (videoRef.current) {
      const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const currentIndex = speeds.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % speeds.length;
      const newSpeed = speeds[nextIndex];
      videoRef.current.playbackRate = newSpeed;
      setPlaybackRate(newSpeed);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="text-center">
          <Video className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-2xl font-semibold mb-2 text-primary">جاري تحميل الفيديو...</h1>
          <p className="text-foreground">يرجى الانتظار أثناء تحضير المحتوى.</p>
        </div>
      </div>
    );
  }

  if (!video || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient p-4">
        <Card className="w-full max-w-md card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-primary">الفيديو غير متاح</CardTitle>
            <CardDescription>
              لم يتم العثور على الفيديو المطلوب أو أنه غير جاهز للعرض.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline" className="hover-lift">
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة للوحة الإدارة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover-lift"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة للوحة الإدارة
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-primary">{video.title}</h1>
            {profile && (
              <p className="text-sm text-muted-foreground">
                يشاهد: {profile.email}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden card-shadow">
              <div className="aspect-video bg-black relative">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={false}
                  className="w-full h-full"
                  poster="/placeholder.svg"
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <p className="text-white p-4">
                    متصفحك لا يدعم تشغيل HTML5 للفيديو.
                  </p>
                </video>
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                    <Play className="h-3 w-3 ml-1" />
                    جودة عالية
                  </Badge>
                </div>
              </div>
              
              {/* Custom Video Controls */}
              <div className="p-4 bg-card border-t">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    السرعة: {playbackRate}x
                  </span>
                </div>
                
                <div className="w-full bg-secondary rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSeekBackward}
                    className="h-10 w-10 hover-lift"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePlayPause}
                    className="h-10 w-10 hover-lift"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleStop}
                    className="h-10 w-10 hover-lift"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSeekForward}
                    className="h-10 w-10 hover-lift"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSpeedChange}
                    className="h-10 w-10 hover-lift"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Video className="h-5 w-5" />
                  تفاصيل الفيديو
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">المدة</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration_seconds)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الحالة</span>
                    <Badge variant="secondary" className="capitalize bg-accent text-accent-foreground">
                      {video.status === 'ready' ? 'جاهز' : video.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">تاريخ النشر</span>
                    <span>{formatDate(video.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-sm text-primary">دليل التحكم</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• اضغط زر التشغيل/الإيقاف للتحكم في التشغيل</p>
                  <p>• استخدم زر الإيقاف لإعادة تعيين الفيديو</p>
                  <p>• أزرار التخطي تقفز 10 ثوانِ</p>
                  <p>• زر السرعة يغير معدل التشغيل</p>
                  <p className="text-primary font-medium">• تشغيل آمن - التحميل معطل</p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full hover-lift"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.requestFullscreen) {
                        videoRef.current.requestFullscreen();
                      }
                    }
                  }}
                >
                  <Play className="h-3 w-3 ml-2" />
                  وضع الشاشة الكاملة
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoPlayer;
