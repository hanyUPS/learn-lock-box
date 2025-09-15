import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Home, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavigationHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

const NavigationHeader = ({ 
  title, 
  subtitle, 
  showBackButton, 
  backTo = "/", 
  backLabel = "العودة", 
  children 
}: NavigationHeaderProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link to={backTo}>
                <Button variant="ghost" size="sm">
                  <span className="ml-2">←</span>
                  {backLabel}
                </Button>
              </Link>
            )}
            
            <div>
              <h1 className="text-xl font-bold text-primary">
                {title || "منصة التعلم الآمنة"}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            
            {children}
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="hover-lift">
                <Home className="h-4 w-4 ml-1" />
                الرئيسية
              </Button>
            </Link>
            
            {profile && (
              <div className="text-right mx-2">
                <span className="text-sm font-medium text-foreground block">{profile.email}</span>
                <span className="text-xs text-muted-foreground">
                  {profile.role === 'admin' ? 'مسؤول' : 'طالب'}
                </span>
              </div>
            )}
            
            <Button onClick={handleSignOut} variant="outline" size="sm" className="hover-lift">
              <LogOut className="h-4 w-4 ml-1" />
              خروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;