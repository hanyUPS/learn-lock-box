import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  status: string;
}

const AdminCourseManagement = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCourseVideos, setSelectedCourseVideos] = useState<string[]>([]);
  const [managingVideos, setManagingVideos] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration_months: '1'
  });

  useEffect(() => {
    fetchCourses();
    fetchVideos();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
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

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, status')
        .eq('status', 'ready')
        .order('title');

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchCourseVideos = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_videos')
        .select('video_id')
        .eq('course_id', courseId);

      if (error) throw error;
      setSelectedCourseVideos(data?.map(cv => cv.video_id) || []);
    } catch (error) {
      console.error('Error fetching course videos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const courseData = {
        title: formData.title,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : 0,
        duration_months: parseInt(formData.duration_months)
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث الكورس بنجاح"
        });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([courseData]);

        if (error) throw error;

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء الكورس بنجاح"
        });
      }

      resetForm();
      fetchCourses();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الكورس",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الكورس بنجاح"
      });

      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الكورس",
        variant: "destructive"
      });
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: !currentStatus })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: `تم ${!currentStatus ? 'تفعيل' : 'إيقاف'} الكورس بنجاح`
      });

      fetchCourses();
    } catch (error) {
      console.error('Error toggling course status:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الكورس",
        variant: "destructive"
      });
    }
  };

  const handleManageVideos = async (courseId: string) => {
    await fetchCourseVideos(courseId);
    setManagingVideos(courseId);
  };

  const handleVideoToggle = (videoId: string) => {
    setSelectedCourseVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const saveCourseVideos = async () => {
    if (!managingVideos) return;

    try {
      // Remove all existing course videos
      await supabase
        .from('course_videos')
        .delete()
        .eq('course_id', managingVideos);

      // Add selected videos
      if (selectedCourseVideos.length > 0) {
        const courseVideos = selectedCourseVideos.map((videoId, index) => ({
          course_id: managingVideos,
          video_id: videoId,
          order_index: index
        }));

        const { error } = await supabase
          .from('course_videos')
          .insert(courseVideos);

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ فيديوهات الكورس بنجاح"
      });

      setManagingVideos(null);
      setSelectedCourseVideos([]);
    } catch (error) {
      console.error('Error saving course videos:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ فيديوهات الكورس",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      duration_months: '1'
    });
    setEditingCourse(null);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      price: course.price?.toString() || '',
      duration_months: course.duration_months.toString()
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">جاري تحميل الكورسات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة الكورسات</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 ml-1" />
              كورس جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCourse ? 'تعديل الكورس' : 'كورس جديد'}</DialogTitle>
              <DialogDescription>
                {editingCourse ? 'تعديل بيانات الكورس' : 'إضافة كورس جديد للمنصة'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان الكورس</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">السعر (ريال)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration">المدة (أشهر)</Label>
                  <Select 
                    value={formData.duration_months} 
                    onValueChange={(value) => setFormData({...formData, duration_months: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">شهر واحد</SelectItem>
                      <SelectItem value="2">شهران</SelectItem>
                      <SelectItem value="3">3 أشهر</SelectItem>
                      <SelectItem value="6">6 أشهر</SelectItem>
                      <SelectItem value="12">12 شهر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCourse ? 'حفظ التغييرات' : 'إنشاء الكورس'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Video Management Dialog */}
      <Dialog open={!!managingVideos} onOpenChange={() => setManagingVideos(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إدارة فيديوهات الكورس</DialogTitle>
            <DialogDescription>
              اختر الفيديوهات التي تريد إضافتها لهذا الكورس
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {videos.map((video) => (
              <div key={video.id} className="flex items-center space-x-2 p-2 border rounded">
                <input
                  type="checkbox"
                  checked={selectedCourseVideos.includes(video.id)}
                  onChange={() => handleVideoToggle(video.id)}
                  className="ml-2"
                />
                <div className="flex-1">
                  <p className="font-medium">{video.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {video.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={saveCourseVideos} className="flex-1">
              حفظ الفيديوهات
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setManagingVideos(null)}
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">لا توجد كورسات بعد</p>
            </CardContent>
          </Card>
        ) : (
          courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <Badge variant={course.is_active ? 'default' : 'secondary'}>
                    {course.is_active ? 'مفعل' : 'معطل'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>السعر: {course.price} ريال</span>
                    <span>المدة: {course.duration_months} {course.duration_months === 1 ? 'شهر' : 'أشهر'}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleManageVideos(course.id)}
                    >
                      إدارة الفيديوهات
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleCourseStatus(course.id, course.is_active)}
                    >
                      {course.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditDialog(course)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCourseManagement;