import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { SoftphoneDock } from "./SoftphoneDock";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // Don't show AppShell on auth pages
  if (!user || location === '/' || location === '/auth') {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden" data-testid="app-shell">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <AppTopbar />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Softphone dock - always visible when authenticated */}
      <SoftphoneDock />
    </div>
  );
}