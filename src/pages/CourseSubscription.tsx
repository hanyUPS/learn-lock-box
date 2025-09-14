import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageCircle, Upload, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_months: number;
}

const CourseSubscription = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionMethod, setSubscriptionMethod] = useState<'whatsapp' | 'upload' | 'password' | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    if (!courseId) return;
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error fetching course:', error);
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

  const handlePasswordSubscription = async () => {
    if (!password.trim() || !course || !user) return;

    setUploading(true);
    try {
      // Check if password exists and is valid
      const { data: passwordData, error: passwordError } = await supabase
        .from('course_passwords')
        .select('*')
        .eq('course_id', course.id)
        .eq('password', password.trim())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (passwordError || !passwordData) {
        toast({
          title: "خطأ",
          description: "كلمة المرور غير صحيحة أو منتهية الصلاحية",
          variant: "destructive"
        });
        return;
      }

      // Create active subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + course.duration_months);

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

      if (subscriptionError) throw subscriptionError;

      // Mark password as used
      await supabase
        .from('course_passwords')
        .update({ used: true })
        .eq('id', passwordData.id);

      toast({
        title: "تم بنجاح",
        description: "تم تفعيل اشتراكك في الكورس بنجاح",
      });

      navigate(`/course/${course.id}`);
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast({
        title: "خطأ",
        description: "فشل في تفعيل الاشتراك",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!paymentFile || !course || !user) return;

    setUploading(true);
    try {
      // Upload payment receipt
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${user.id}/${course.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, paymentFile);

      if (uploadError) throw uploadError;

      // Create pending subscription
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          course_id: course.id,
          status: 'pending',
          payment_proof: uploadData.path
        });

      if (subscriptionError) throw subscriptionError;

      toast({
        title: "تم الإرسال",
        description: "تم إرسال طلب الاشتراك بنجاح، سيتم مراجعته قريباً",
      });

      navigate('/courses');
    } catch (error) {
      console.error('Error uploading payment:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفع إيصال الدفع",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!course) return '';
    return encodeURIComponent(
      `مرحباً، أريد الاشتراك في كورس: ${course.title}\nالسعر: ${course.price} ريال\nالمدة: ${course.duration_months} ${course.duration_months === 1 ? 'شهر' : 'أشهر'}\n\nيرجى إرسال تفاصيل الدفع وكلمة المرور.`
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>مطلوب تسجيل الدخول</CardTitle>
            <CardDescription>يرجى تسجيل الدخول للاشتراك في الكورس</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>الكورس غير موجود</CardTitle>
            <CardDescription>الكورس المطلوب غير متاح</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة للكورسات
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-primary">الاشتراك في الكورس</h1>
              <p className="text-sm text-muted-foreground">{course.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <CardDescription>{course.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{course.price} ريال</p>
                <p className="text-sm text-muted-foreground">السعر</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{course.duration_months}</p>
                <p className="text-sm text-muted-foreground">{course.duration_months === 1 ? 'شهر' : 'أشهر'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!subscriptionMethod && (
          <Card>
            <CardHeader>
              <CardTitle>اختر طريقة الاشتراك</CardTitle>
              <CardDescription>يمكنك الاشتراك عبر إحدى الطرق التالية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full h-16 text-lg" 
                onClick={() => setSubscriptionMethod('whatsapp')}
                variant="default"
              >
                <MessageCircle className="h-6 w-6 ml-2" />
                التواصل عبر واتساب
              </Button>
              
              <Button 
                className="w-full h-16 text-lg" 
                onClick={() => setSubscriptionMethod('upload')}
                variant="outline"
              >
                <Upload className="h-6 w-6 ml-2" />
                رفع إيصال الدفع
              </Button>

              <Separator />

              <Button 
                className="w-full h-16 text-lg" 
                onClick={() => setSubscriptionMethod('password')}
                variant="secondary"
              >
                لدي كلمة مرور من الإدارة
              </Button>
            </CardContent>
          </Card>
        )}

        {subscriptionMethod === 'whatsapp' && (
          <Card>
            <CardHeader>
              <CardTitle>التواصل عبر واتساب</CardTitle>
              <CardDescription>
                سيتم توجيهك لمحادثة واتساب مع الإدارة لإتمام عملية الدفع والحصول على كلمة المرور
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  بعد التواصل مع الإدارة ودفع الرسوم، ستحصل على كلمة مرور يمكنك استخدامها لتفعيل الاشتراك مباشرة
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/966500000000?text=${generateWhatsAppMessage()}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 ml-2" />
                  فتح واتساب
                </Button>
                <Button variant="outline" onClick={() => setSubscriptionMethod(null)}>
                  العودة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptionMethod === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>رفع إيصال الدفع</CardTitle>
              <CardDescription>
                ارفع صورة إيصال الدفع وسيتم مراجعة طلبك خلال 24 ساعة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-file">إيصال الدفع</Label>
                <Input
                  id="payment-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                />
              </div>

              {paymentFile && (
                <Alert>
                  <AlertDescription>
                    تم اختيار الملف: {paymentFile.name}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={handleFileUpload}
                  disabled={!paymentFile || uploading}
                >
                  {uploading ? 'جاري الرفع...' : 'رفع الإيصال'}
                </Button>
                <Button variant="outline" onClick={() => setSubscriptionMethod(null)}>
                  العودة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptionMethod === 'password' && (
          <Card>
            <CardHeader>
              <CardTitle>كلمة المرور</CardTitle>
              <CardDescription>
                أدخل كلمة المرور التي حصلت عليها من الإدارة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={handlePasswordSubscription}
                  disabled={!password.trim() || uploading}
                >
                  {uploading ? 'جاري التفعيل...' : 'تفعيل الاشتراك'}
                </Button>
                <Button variant="outline" onClick={() => setSubscriptionMethod(null)}>
                  العودة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CourseSubscription;