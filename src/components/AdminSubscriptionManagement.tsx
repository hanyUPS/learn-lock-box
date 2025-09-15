import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Search, Eye, Calendar } from 'lucide-react';

interface Subscription {
  id: string;
  status: 'pending' | 'active' | 'expired';
  start_date: string | null;
  end_date: string | null;
  payment_proof: string | null;
  created_at: string;
  user_id: string;
  course_id: string;
  profiles: {
    email: string;
    role: string;
  };
  courses: {
    title: string;
    duration_months: number;
  };
}

const AdminSubscriptionManagement = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [renewingSubscription, setRenewingSubscription] = useState<Subscription | null>(null);
  const [renewalMonths, setRenewalMonths] = useState('1');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles:profiles!inner (email, role),
          courses:courses!inner (title, duration_months)
        `)
        .order('created_at', { ascending: false })
        .returns<Subscription[]>();

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الاشتراكات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveSubscription = async (subscription: Subscription) => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + subscription.courses.duration_months);

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Delete payment receipt after approval
      if (subscription.payment_proof) {
        await supabase.storage
          .from('payment-receipts')
          .remove([subscription.payment_proof]);
      }

      // Update local state
      const { error: finalUpdateError } = await supabase
        .from('subscriptions')
        .update({ payment_proof: null })
        .eq('id', subscription.id);

      if (finalUpdateError) throw finalUpdateError;

      toast({
        title: "تم التفعيل",
        description: "تم تفعيل الاشتراك وحذف إيصال الدفع تلقائياً"
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error approving subscription:', error);
      toast({
        title: "خطأ",
        description: "فشل في تفعيل الاشتراك",
        variant: "destructive"
      });
    }
  };

  const rejectSubscription = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من رفض هذا الاشتراك؟')) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "تم الرفض",
        description: "تم رفض الاشتراك وحذفه"
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفض الاشتراك",
        variant: "destructive"
      });
    }
  };

  const renewSubscription = async () => {
    if (!renewingSubscription) return;

    try {
      const currentEndDate = renewingSubscription.end_date ? new Date(renewingSubscription.end_date) : new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(renewalMonths));

      const { error } = await supabase
        .from('subscriptions')
        .update({
          end_date: newEndDate.toISOString(),
          status: 'active'
        })
        .eq('id', renewingSubscription.id);

      if (error) throw error;

      toast({
        title: "تم التجديد",
        description: `تم تجديد الاشتراك لـ ${renewalMonths} ${renewalMonths === '1' ? 'شهر' : 'أشهر'}`
      });

      setRenewingSubscription(null);
      setRenewalMonths('1');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: "خطأ",
        description: "فشل في تجديد الاشتراك",
        variant: "destructive"
      });
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاشتراك نهائياً؟')) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الاشتراك نهائياً"
      });

      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الاشتراك",
        variant: "destructive"
      });
    }
  };

  const viewPaymentReceipt = async (paymentProof: string) => {
    try {
      const { data } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(paymentProof, 300); // 5 minutes

      if (data?.signedUrl) {
        setViewingReceipt(data.signedUrl);
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      toast({
        title: "خطأ",
        description: "فشل في عرض الإيصال",
        variant: "destructive"
      });
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.courses.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">مفعل</Badge>;
      case 'pending':
        return <Badge variant="secondary">في الانتظار</Badge>;
      case 'expired':
        return <Badge variant="destructive">منتهي</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">جاري تحميل الاشتراكات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة الاشتراكات</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالإيميل أو اسم الكورس..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="active">مفعل</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إيصال الدفع</DialogTitle>
            <DialogDescription>
              مراجعة إيصال الدفع المرفوع من الطالب
            </DialogDescription>
          </DialogHeader>
          
          {viewingReceipt && (
            <div className="text-center">
              <img 
                src={viewingReceipt} 
                alt="إيصال الدفع" 
                className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={!!renewingSubscription} onOpenChange={() => setRenewingSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجديد الاشتراك</DialogTitle>
            <DialogDescription>
              تجديد اشتراك {renewingSubscription?.profiles.email} في كورس {renewingSubscription?.courses.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">مدة التجديد</label>
              <Select value={renewalMonths} onValueChange={setRenewalMonths}>
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

            <div className="flex gap-2 pt-4">
              <Button onClick={renewSubscription} className="flex-1">
                تجديد الاشتراك
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setRenewingSubscription(null)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {filteredSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد اشتراكات بعد'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{subscription.profiles.email}</h3>
                      {getStatusBadge(subscription.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      الكورس: {subscription.courses.title}
                    </p>
                    
                    {subscription.status === 'active' && subscription.end_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          ينتهي في: {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
                          {(() => {
                            const days = getDaysRemaining(subscription.end_date);
                            if (days <= 7 && days > 0) {
                              return <span className="text-orange-600 font-medium"> ({days} {days === 1 ? 'يوم' : 'أيام'} متبقية)</span>;
                            } else if (days <= 0) {
                              return <span className="text-red-600 font-medium"> (منتهي)</span>;
                            }
                            return null;
                          })()}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      تاريخ الطلب: {new Date(subscription.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {subscription.status === 'pending' && subscription.payment_proof && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => viewPaymentReceipt(subscription.payment_proof!)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => approveSubscription(subscription)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rejectSubscription(subscription.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {subscription.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setRenewingSubscription(subscription)}
                      >
                        <Clock className="h-4 w-4 ml-1" />
                        تجديد
                      </Button>
                    )}

                    {(subscription.status === 'expired' || subscription.status === 'pending') && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteSubscription(subscription.id)}
                      >
                        حذف
                      </Button>
                    )}
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

export default AdminSubscriptionManagement;