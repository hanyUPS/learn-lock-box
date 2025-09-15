import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Clock, DollarSign, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
}

interface UserSubscription {
  id: string;
  course_id: string;
  status: 'pending' | 'active' | 'expired';
  start_date: string | null;
  end_date: string | null;
}

const StudentDashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    if (user) {
      fetchUserSubscriptions();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الكورسات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscriptions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const getSubscriptionStatus = (courseId: string) => {
    const subscription = subscriptions.find(s => s.course_id === courseId);
    if (!subscription) return null;
    
    if (subscription.status === 'active' && subscription.end_date) {
      const endDate = new Date(subscription.end_date);
      if (endDate > new Date()) {
        return { status: 'active', endDate };
      } else {
        return { status: 'expired' };
      }
    }
    
    return { status: subscription.status };
  };

  if (loading) {
    return <div className="text-center">جاري التحميل...</div>;
  }

  const activeCourses = courses.filter(course => {
    const subscriptionStatus = getSubscriptionStatus(course.id);
    return subscriptionStatus?.status === 'active';
  });

  const pendingCourses = courses.filter(course => {
    const subscriptionStatus = getSubscriptionStatus(course.id);
    return subscriptionStatus?.status === 'pending';
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الكورسات المتاحة</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{courses.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">اشتراكاتي النشطة</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeCourses.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingCourses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Courses */}
      {activeCourses.length > 0 && (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-xl">كورساتي النشطة</CardTitle>
            <CardDescription>
              الكورسات التي لديك اشتراك نشط بها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCourses.map((course) => {
                const subscriptionStatus = getSubscriptionStatus(course.id);
                
                return (
                  <Card key={course.id} className="overflow-hidden hover-lift border-0 shadow-md">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary" />
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
                          <Badge variant="default">مفعل</Badge>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{course.price ? `${course.price} ريال` : 'مجاني'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration_months} {course.duration_months === 1 ? 'شهر' : 'أشهر'}</span>
                          </div>
                        </div>
                        {subscriptionStatus?.endDate && (
                          <p className="text-xs text-muted-foreground">
                            ينتهي في: {new Date(subscriptionStatus.endDate).toLocaleDateString('ar-SA')}
                          </p>
                        )}
                        <Button 
                          className="w-full"
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          دخول الكورس
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Browse All Courses */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-xl">تصفح جميع الكورسات</CardTitle>
          <CardDescription>
            اكتشف واشترك في الكورسات المتاحة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              استكشف مكتبتنا الشاملة من الكورسات التعليمية
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/courses')}
              className="hover-lift"
            >
              تصفح الكورسات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;