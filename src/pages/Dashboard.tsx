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
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!profile.approved && profile.role === 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your account is pending admin approval. Please wait for an administrator to approve your access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Video Learning Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile.email} ({profile.role})
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              Sign Out
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