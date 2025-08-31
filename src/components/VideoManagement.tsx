import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Video, Edit, Trash2, Eye, EyeOff, Settings, Download } from 'lucide-react';

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  file_path: string;
  status: 'processing' | 'ready' | 'disabled';
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface VideoManagementProps {
  refreshTrigger?: number;
}

const VideoManagement = ({ refreshTrigger }: VideoManagementProps) => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'ready' | 'disabled'>('ready');
  const { toast } = useToast();

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
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [refreshTrigger]);

  const handleEdit = (video: VideoRecord) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditStatus(video.status === 'disabled' ? 'disabled' : 'ready');
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;

    const { error } = await supabase
      .from('videos')
      .update({
        title: editTitle,
        description: editDescription,
        status: editStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingVideo.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update video',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Video updated successfully',
      });
      setEditingVideo(null);
      fetchVideos();
    }
  };

  const handleDelete = async (video: VideoRecord) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`)) {
      return;
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([video.file_path]);

    if (storageError) {
      console.warn('Error deleting file from storage:', storageError);
    }

    // Delete from database
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', video.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Video deleted successfully',
      });
      fetchVideos();
    }
  };

  const toggleVideoStatus = async (video: VideoRecord) => {
    const newStatus = video.status === 'ready' ? 'disabled' : 'ready';
    
    const { error } = await supabase
      .from('videos')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', video.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update video status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Video ${newStatus === 'ready' ? 'enabled' : 'disabled'} successfully`,
      });
      fetchVideos();
    }
  };

  const getVideoUrl = async (video: VideoRecord) => {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.file_path, 3600); // 1 hour expiry

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast({
        title: 'Error',
        description: 'Failed to generate video URL',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'disabled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div>Loading videos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Video Management
        </CardTitle>
        <CardDescription>
          Manage your video library and control availability
        </CardDescription>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No videos uploaded yet.</p>
            <p className="text-sm text-muted-foreground">
              Upload your first video using the upload form above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <Card key={video.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{video.title}</h3>
                      <Badge 
                        variant="secondary" 
                        className={`text-white ${getStatusColor(video.status)}`}
                      >
                        {video.status}
                      </Badge>
                    </div>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mb-2">{video.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Duration: {formatDuration(video.duration_seconds)}</span>
                      <span>Created: {formatDate(video.created_at)}</span>
                      <span>Updated: {formatDate(video.updated_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleVideoStatus(video)}
                      disabled={video.status === 'processing'}
                    >
                      {video.status === 'ready' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getVideoUrl(video)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(video)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Video</DialogTitle>
                          <DialogDescription>
                            Update video information and availability
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                              id="edit-title"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-status">Status</Label>
                            <Select value={editStatus} onValueChange={(value: 'ready' | 'disabled') => setEditStatus(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ready">Ready (Visible to students)</SelectItem>
                                <SelectItem value="disabled">Disabled (Hidden from students)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleSaveEdit} className="w-full">
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoManagement;