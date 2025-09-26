import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ModeBanner } from "@/components/mode-banner";

interface NavbarProps {
  onNavigate?: (path: string) => void;
}

function ConversationsNavButton({ handleNavigation }: { handleNavigation: (path: string) => void }) {
  const { data: countData } = useQuery({
    queryKey: ['/api/conversations/count'],
    queryFn: async () => {
      const response = await fetch('/api/conversations/count?hours=24');
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const count = countData?.count || 0;

  return (
    <Button 
      variant="outline" 
      onClick={() => handleNavigation('/dashboard/conversaciones')}
      className="relative"
      data-testid="button-conversations"
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Conversaciones
      {count > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-2 px-2 py-0.5 text-xs"
          data-testid="badge-conversation-count"
        >
          {count}
        </Badge>
      )}
    </Button>
  );
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
            <ModeBanner />
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
                <ConversationsNavButton handleNavigation={handleNavigation} />
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
