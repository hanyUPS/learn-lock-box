import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  duration_months: number;
}

interface Video {
  id: string;
  title: string;
  description: string;
  file_path: string;
  video_url: string;
  video_type: string;
  duration_seconds: number;
  status: string;
}

interface CourseVideo {
  id: string;
  order_index: number;
  video: Video;
}

interface UserSubscription {
  id: string;
  status: 'active' | 'pending' | 'expired';
  start_date: string;
  end_date: string;
}

const CourseViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [courseVideos, setCourseVideos] = useState<CourseVideo[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && courseId) {
      fetchCourseData();
    }
  }, [user, courseId]);

  const fetchCourseData = async () => {
    if (!courseId || !user) return;

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_active', true)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Check user subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      if (!subscriptionData) {
        toast({
          title: "غير مشترك",
          description: "يجب الاشتراك في الكورس أولاً لمشاهدة المحتوى",
          variant: "destructive"
        });
        navigate(`/course/${courseId}/subscribe`);
        return;
      }

      setSubscription(subscriptionData);

      // Fetch course videos
      const { data: videosData, error: videosError } = await supabase
        .from('course_videos')
        .select(`
          id,
          order_index,
          video:videos (
            id,
            title,
            description,
            file_path,
            video_url,
            video_type,
            duration_seconds,
            status
          )
        `)
        .eq('course_id', courseId)
        .eq('video.status', 'ready')
        .order('order_index');

      if (videosError) throw videosError;
      setCourseVideos(videosData || []);

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الكورس",
        variant: "destructive"
      });
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>مطلوب تسجيل الدخول</CardTitle>
            <CardDescription>يرجى تسجيل الدخول لعرض الكورس</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الكورس...</p>
        </div>
      </div>
    );
  }

  if (!course || !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>الكورس غير متاح</CardTitle>
            <CardDescription>الكورس غير موجود أو انتهت صلاحية اشتراكك</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(subscription.end_date);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/courses">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  العودة للكورسات
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-primary">{course.title}</h1>
                <p className="text-sm text-muted-foreground">{course.description}</p>
              </div>
            </div>
            
            <div className="text-left">
              <Badge variant={daysRemaining > 7 ? 'default' : 'destructive'}>
                {daysRemaining > 0 ? `${daysRemaining} يوم متبقي` : 'انتهى الاشتراك'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                ينتهي في: {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {courseVideos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد فيديوهات</h3>
              <p className="text-muted-foreground">لم يتم إضافة فيديوهات لهذا الكورس بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  محتويات الكورس
                </CardTitle>
                <CardDescription>
                  {courseVideos.length} فيديو • إجمالي المدة: {formatDuration(
                    courseVideos.reduce((total, cv) => total + (cv.video.duration_seconds || 0), 0)
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {courseVideos.map((courseVideo, index) => (
                <Card key={courseVideo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{courseVideo.video.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {courseVideo.video.description || 'لا يوجد وصف'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {courseVideo.video.duration_seconds && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(courseVideo.video.duration_seconds)}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {courseVideo.video.video_type === 'file' ? 'ملف مرفوع' : 'رابط خارجي'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link to={`/video/${courseVideo.video.id}`}>
                          <Button size="sm">
                            <Play className="h-4 w-4 ml-1" />
                            تشغيل
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {daysRemaining <= 7 && daysRemaining > 0 && (
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-800">تنبيه: اقتراب انتهاء الاشتراك</h3>
                  <p className="text-sm text-orange-600">
                    سينتهي اشتراكك في هذا الكورس خلال {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'}
                  </p>
                </div>
                <Link to={`/course/${courseId}/subscribe`}>
                  <Button variant="outline" size="sm">
                    جدد الاشتراك
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CourseViewer;