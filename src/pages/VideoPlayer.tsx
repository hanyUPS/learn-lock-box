import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Play, Video, Clock } from 'lucide-react';

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
        title: 'Error',
        description: error.message || 'Failed to load video',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <h1 className="text-xl font-semibold mb-2">Loading video...</h1>
          <p className="text-muted-foreground">Please wait while we prepare your content.</p>
        </div>
      </div>
    );
  }

  if (!video || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Video not available</CardTitle>
            <CardDescription>
              The requested video could not be found or is not ready for viewing.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{video.title}</h1>
            {profile && (
              <p className="text-sm text-muted-foreground">
                Watching as {profile.email}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  poster="/placeholder.svg"
                  preload="metadata"
                >
                  <p className="text-white p-4">
                    Your browser doesn't support HTML5 video. 
                    <a href={videoUrl} className="underline ml-1">
                      Download the video instead.
                    </a>
                  </p>
                </video>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
                    <Play className="h-3 w-3 mr-1" />
                    HD Quality
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Details
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
                    <span className="text-muted-foreground">Duration</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration_seconds)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">
                      {video.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Published</span>
                    <span>{formatDate(video.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Playback Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Use spacebar to play/pause</p>
                  <p>• Use arrow keys to seek</p>
                  <p>• Press F for fullscreen</p>
                  <p>• Right-click for more options</p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const video = document.querySelector('video');
                    if (video) {
                      if (video.requestFullscreen) {
                        video.requestFullscreen();
                      }
                    }
                  }}
                >
                  <Play className="h-3 w-3 mr-2" />
                  Fullscreen Mode
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