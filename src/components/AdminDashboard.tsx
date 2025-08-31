import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Video, Upload, Shield } from 'lucide-react';

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
        title: 'Error',
        description: 'Failed to fetch users',
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
        title: 'Error',
        description: 'Failed to fetch videos',
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
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'User approved successfully',
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
        title: 'Error',
        description: 'Failed to reject user',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'User access revoked',
      });
      fetchUsers();
    }
  };

  const toggleVideoStatus = async (videoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ready' ? 'disabled' : 'ready';
    
    const { error } = await supabase
      .from('videos')
      .update({ status: newStatus })
      .eq('id', videoId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update video status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Video ${newStatus}`,
      });
      fetchVideos();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => !u.approved && u.role === 'student').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Videos</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter(v => v.status === 'ready').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="videos">Video Management</TabsTrigger>
          <TabsTrigger value="upload">Upload Videos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Approve or reject user access to the platform
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
                          {user.role}
                        </Badge>
                        <Badge variant={user.approved ? 'default' : 'outline'}>
                          {user.approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    {user.role === 'student' && (
                      <div className="flex gap-2">
                        {!user.approved ? (
                          <Button
                            onClick={() => approveUser(user.user_id)}
                            size="sm"
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button
                            onClick={() => rejectUser(user.user_id)}
                            variant="outline"
                            size="sm"
                          >
                            Revoke Access
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
        
        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Management</CardTitle>
              <CardDescription>
                Manage your video library and control availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{video.title}</p>
                      <p className="text-sm text-muted-foreground">{video.description}</p>
                      <Badge variant={video.status === 'ready' ? 'default' : 'secondary'}>
                        {video.status}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => toggleVideoStatus(video.id, video.status)}
                      variant={video.status === 'ready' ? 'outline' : 'default'}
                      size="sm"
                    >
                      {video.status === 'ready' ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Videos</CardTitle>
              <CardDescription>
                Upload new videos to the platform (Feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Video upload functionality will be implemented next. This will allow you to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Upload video files directly to Supabase Storage</li>
                <li>Automatically register videos in the database</li>
                <li>Generate thumbnails for video previews</li>
                <li>Set video metadata like title and description</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;