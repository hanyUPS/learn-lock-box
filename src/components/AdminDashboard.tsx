import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Video, Upload, Shield, Settings, CheckCircle } from 'lucide-react';
import VideoUpload from '@/components/VideoUpload';
import VideoManagement from '@/components/VideoManagement';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'student';
  approved: boolean;
  created_at: string;
}

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  file_path: string;
  status: 'processing' | 'ready' | 'disabled';
  duration_seconds: number | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchVideos();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المستخدمين',
        variant: 'destructive',
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
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
  };

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في الموافقة على المستخدم',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'نجح',
        description: 'تم قبول المستخدم بنجاح',
      });
      fetchUsers();
    }
  };

  const rejectUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في رفض المستخدم',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'نجح',
        description: 'تم إلغاء وصول المستخدم',
      });
      fetchUsers();
    }
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchVideos(); // Refresh videos list
  };

  const toggleVideoStatus = async (videoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ready' ? 'disabled' : 'ready';
    
    const { error } = await supabase
      .from('videos')
      .update({ status: newStatus })
      .eq('id', videoId);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الفيديو',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'نجح',
        description: `الفيديو ${newStatus === 'ready' ? 'جاهز' : 'معطل'}`,
      });
      fetchVideos();
    }
  };

  if (loading) {
    return <div className="text-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في انتظار الموافقة</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => !u.approved && u.role === 'student').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفيديوهات</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{videos.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفيديوهات الجاهزة</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {videos.filter(v => v.status === 'ready').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة المستخدمين
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            رفع فيديوهات
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            إدارة الفيديوهات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>إدارة المستخدمين</CardTitle>
              <CardDescription>
                موافقة أو رفض وصول المستخدمين للمنصة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'مسؤول' : 'طالب'}
                        </Badge>
                        <Badge variant={user.approved ? 'default' : 'outline'}>
                          {user.approved ? 'معتمد' : 'في الانتظار'}
                        </Badge>
                      </div>
                    </div>
                    {user.role === 'student' && (
                      <div className="flex gap-2">
                        {!user.approved ? (
                          <Button
                            onClick={() => approveUser(user.user_id)}
                            size="sm"
                            className="hover-lift"
                          >
                            موافقة
                          </Button>
                        ) : (
                          <Button
                            onClick={() => rejectUser(user.user_id)}
                            variant="outline"
                            size="sm"
                            className="hover-lift"
                          >
                            إلغاء الوصول
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <VideoUpload onUploadComplete={handleUploadComplete} />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <VideoManagement refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;