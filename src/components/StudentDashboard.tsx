import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Clock, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  file_path: string;
  status: 'processing' | 'ready' | 'disabled';
  duration_seconds: number | null;
  created_at: string;
}

const StudentDashboard = () => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch videos',
        variant: 'destructive',
      });
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayVideo = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(videos.reduce((acc, video) => acc + (video.duration_seconds || 0), 0) / 60)} min
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter(v => {
                const videoDate = new Date(v.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return videoDate > weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Library</CardTitle>
          <CardDescription>
            Access your approved video content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No videos available yet.</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new content.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {formatDuration(video.duration_seconds)}
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handlePlayVideo(video.id)}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Play
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;