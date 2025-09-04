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
        title: 'خطأ',
        description: 'فشل في تحميل الفيديوهات',
        variant: 'destructive',
      });
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'غير محدد';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayVideo = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  if (loading) {
    return <div className="text-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفيديوهات المتاحة</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{videos.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدة</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.floor(videos.reduce((acc, video) => acc + (video.duration_seconds || 0), 0) / 60)} دقيقة
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المضاف حديثاً</CardTitle>
            <Play className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
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

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-xl">مكتبة الفيديوهات</CardTitle>
          <CardDescription>
            اصل إلى المحتوى التعليمي المعتمد
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">لا توجد فيديوهات متاحة حالياً.</p>
              <p className="text-sm text-muted-foreground">
                تحقق لاحقاً من المحتوى الجديد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover-lift border-0 shadow-md">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <Video className="h-12 w-12 text-primary" />
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-accent text-accent-foreground">
                          {formatDuration(video.duration_seconds)}
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handlePlayVideo(video.id)}
                          className="flex items-center gap-1 hover-lift"
                        >
                          <Play className="h-3 w-3" />
                          تشغيل
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