import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/layouts/sidebar-nav";
import { CallBar } from "@/components/softphone/call-bar";
import { useSoftphone } from "@/components/softphone/softphone-provider";
import { featureFlags } from "@/lib/feature-flags";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * New Chatwoot-style AppShell layout with persistent left sidebar
 * - Persistent left sidebar (~260px)
 * - NO top bars of any kind
 * - Main content area with consistent padding
 * - CallBar (softphone) at bottom
 */
export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { isPanelOpen, openPanel, closePanel } = useSoftphone();

  // Don't show AppShell on auth pages or when feature flag is disabled
  if (!user || location === '/' || location === '/auth' || !featureFlags.chatwootLayout) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden" data-testid="chatwoot-app-shell">
      {/* Persistent Left Sidebar - ~260px */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <SidebarNav />
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* NO TOPBAR - As per requirements */}
        
        {/* Page Content with consistent padding */}
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-900 p-6">
          {children}
        </main>
      </div>
      
      {/* CallBar (Softphone) - Always visible at bottom */}
      <CallBar 
        onTogglePanel={() => isPanelOpen ? closePanel() : openPanel()}
        isPanelOpen={isPanelOpen}
      />
    </div>
  );
}