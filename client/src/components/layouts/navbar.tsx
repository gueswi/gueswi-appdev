import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface NavbarProps {
  onNavigate?: (path: string) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      setLocation(path);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3" data-testid="navbar-logo">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gueswi</h1>
              <p className="text-sm text-muted-foreground">Centralita Virtual con IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4" data-testid="navbar-actions">
            {!user ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleNavigation('/')}
                  data-testid="button-home"
                >
                  Inicio
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleNavigation('/auth')}
                  data-testid="button-auth"
                >
                  Acceder
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleNavigation('/dashboard')}
                  data-testid="button-dashboard"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  Cerrar Sesión
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
