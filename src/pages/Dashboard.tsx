import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDashboard from '@/components/AdminDashboard';
import StudentDashboard from '@/components/StudentDashboard';

const Dashboard = () => {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md card-shadow">
          <CardHeader className="text-center">
            <CardTitle>جاري التحميل...</CardTitle>
            <CardDescription>يرجى الانتظار أثناء تحميل ملفك الشخصي.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!profile.approved && profile.role === 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient p-4">
        <Card className="w-full max-w-md card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-primary">في انتظار الموافقة</CardTitle>
            <CardDescription className="text-base">
              حسابك في انتظار موافقة المسؤول. يرجى الانتظار لحين موافقة المسؤول على دخولك للمنصة.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleSignOut} variant="outline" className="hover-lift">
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">منصة التعلم الآمنة</h1>
          <div className="flex items-center gap-4">
            <div className="text-left">
              <span className="text-sm font-medium text-foreground block">{profile.email}</span>
              <span className="text-xs text-muted-foreground">
                {profile.role === 'admin' ? 'مسؤول' : 'طالب'}
              </span>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="hover-lift">
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {profile.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;