import { useLocation } from "wouter";
import { ChevronRight, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// Breadcrumb mapping for different routes
const getBreadcrumbs = (location: string) => {
  const segments = location.split('/').filter(Boolean);
  
  if (location === '/dashboard') {
    return [{ label: 'Home', href: '/dashboard' }];
  }
  
  if (location === '/inbox') {
    return [
      { label: 'Home', href: '/dashboard' },
      { label: 'Inbox', href: '/inbox' }
    ];
  }
  
  if (location.startsWith('/settings')) {
    const breadcrumbs = [
      { label: 'Home', href: '/dashboard' },
      { label: 'Settings', href: '/settings' }
    ];
    
    if (segments[1]) {
      const settingsPages: Record<string, string> = {
        'telephony': 'Telephony',
        'ai': 'AI',
        'consumption': 'Consumption',
        'billing': 'Billing',
        'teams': 'Teams',
        'integrations': 'Integrations'
      };
      
      const pageLabel = settingsPages[segments[1]] || segments[1];
      breadcrumbs.push({ 
        label: pageLabel, 
        href: `/settings/${segments[1]}` 
      });
    }
    
    return breadcrumbs;
  }
  
  // Default breadcrumbs for other pages
  const pageNames: Record<string, string> = {
    'contacts': 'Contacts',
    'search': 'Search',
    'activity': 'Activity',
    'sona-ai': 'Sona AI',
    'profile': 'Profile'
  };
  
  if (segments[0] && pageNames[segments[0]]) {
    return [
      { label: 'Home', href: '/dashboard' },
      { label: pageNames[segments[0]], href: `/${segments[0]}` }
    ];
  }
  
  return [{ label: 'Home', href: '/dashboard' }];
};

export function AppTopbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const breadcrumbs = getBreadcrumbs(location);
  
  // Mock WebSocket status - replace with actual WebSocket status
  const wsConnected = true; // TODO: Get from WebSocket context

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6" data-testid="app-topbar">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
            <a
              href={crumb.href}
              className={cn(
                "hover:text-primary transition-colors",
                index === breadcrumbs.length - 1
                  ? "text-gray-900 dark:text-white font-medium"
                  : "text-gray-500 dark:text-gray-400"
              )}
              data-testid={`breadcrumb-${index}`}
            >
              {crumb.label}
            </a>
          </div>
        ))}
      </nav>

      {/* Right section with status indicators */}
      <div className="flex items-center space-x-4">
        {/* WebSocket status indicator */}
        <div className="flex items-center space-x-2">
          {wsConnected ? (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Conectado</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">Desconectado</span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}