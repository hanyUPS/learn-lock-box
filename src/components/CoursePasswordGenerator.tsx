import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
}

interface CoursePassword {
  id: string;
  password: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  course: {
    title: string;
  };
}

const CoursePasswordGenerator = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [passwords, setPasswords] = useState<CoursePassword[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchPasswords();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchPasswords = async () => {
    try {
      const { data, error } = await supabase
        .from('course_passwords')
        .select(`
          *,
          courses!inner (title)
        `)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasswords(data || []);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createPassword = async () => {
    if (!selectedCourse) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الكورس",
        variant: "destructive"
      });
      return;
    }

    try {
      const password = customPassword || generateRandomPassword();
      
      const { error } = await supabase
        .from('course_passwords')
        .insert([{
          course_id: selectedCourse,
          password: password
        }]);

      if (error) throw error;

      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء كلمة المرور بنجاح"
      });

      setCustomPassword('');
      fetchPasswords();
    } catch (error) {
      console.error('Error creating password:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء كلمة المرور",
        variant: "destructive"
      });
    }
  };

  const deletePassword = async (passwordId: string) => {
    try {
      const { error } = await supabase
        .from('course_passwords')
        .delete()
        .eq('id', passwordId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف كلمة المرور"
      });

      fetchPasswords();
    } catch (error) {
      console.error('Error deleting password:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف كلمة المرور",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ كلمة المرور"
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء كلمة مرور جديدة</CardTitle>
          <CardDescription>
            إنشاء كلمات مرور لتفعيل الاشتراكات مباشرة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اختيار الكورس</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الكورس" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>كلمة مرور مخصصة (اختياري)</Label>
            <Input
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value.toUpperCase())}
              placeholder="اتركه فارغاً لإنشاء كلمة مرور عشوائية"
              maxLength={20}
            />
          </div>

          <Button onClick={createPassword} className="w-full">
            <Plus className="h-4 w-4 ml-1" />
            إنشاء كلمة المرور
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كلمات المرور النشطة</CardTitle>
          <CardDescription>
            كلمات المرور غير المستخدمة وغير المنتهية الصلاحية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد كلمات مرور نشطة
            </p>
          ) : (
            <div className="space-y-3">
              {passwords.map((password) => (
                <div key={password.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-mono text-lg font-bold">{password.password}</p>
                    <p className="text-sm text-muted-foreground">{password.course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      تنتهي في: {new Date(password.expires_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(password.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => deletePassword(password.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursePasswordGenerator;