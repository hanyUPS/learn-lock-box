import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, DollarSign, BookOpen, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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

const Courses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>مطلوب تسجيل الدخول</CardTitle>
            <CardDescription>يرجى تسجيل الدخول لعرض الكورسات</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/auth">
              <Button>تسجيل الدخول</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الكورسات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              العودة
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">الكورسات التعليمية</h1>
              <p className="text-muted-foreground">اختر الكورس المناسب لك وابدأ رحلة التعلم</p>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد كورسات متاحة</h3>
            <p className="text-muted-foreground">سيتم إضافة كورسات قريباً</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const subscriptionStatus = getSubscriptionStatus(course.id);
              
              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl">{course.title}</CardTitle>
                      {subscriptionStatus && (
                        <Badge 
                          variant={
                            subscriptionStatus.status === 'active' ? 'default' :
                            subscriptionStatus.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {subscriptionStatus.status === 'active' ? 'مفعل' :
                           subscriptionStatus.status === 'pending' ? 'في الانتظار' : 'منتهي'}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {course.description || 'وصف الكورس غير متاح'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{course.price ? `${course.price} ريال` : 'مجاني'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration_months} {course.duration_months === 1 ? 'شهر' : 'أشهر'}</span>
                      </div>
                    </div>

                    {subscriptionStatus?.status === 'active' ? (
                      <div className="space-y-2">
                        <Link to={`/course/${course.id}`}>
                          <Button className="w-full">دخول الكورس</Button>
                        </Link>
                        {subscriptionStatus.endDate && (
                          <p className="text-xs text-center text-muted-foreground">
                            ينتهي في: {new Date(subscriptionStatus.endDate).toLocaleDateString('ar-SA')}
                          </p>
                        )}
                      </div>
                    ) : subscriptionStatus?.status === 'pending' ? (
                      <div className="text-center">
                        <Badge variant="secondary" className="mb-2">في انتظار مراجعة الطلب</Badge>
                        <p className="text-xs text-muted-foreground">
                          سيتم تفعيل اشتراكك بعد مراجعة الإدارة
                        </p>
                      </div>
                    ) : subscriptionStatus?.status === 'expired' ? (
                      <Link to={`/course/${course.id}/subscribe`}>
                        <Button variant="outline" className="w-full">جدد الاشتراك</Button>
                      </Link>
                    ) : (
                      <Link to={`/course/${course.id}/subscribe`}>
                        <Button className="w-full">اشترك الآن</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Courses;