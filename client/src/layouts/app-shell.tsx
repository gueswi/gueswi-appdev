import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/layouts/sidebar-nav";
import { CallBar } from "@/components/softphone/call-bar";
import { useSoftphone } from "@/components/softphone/softphone-provider";
import { featureFlags } from "@/lib/feature-flags";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [previousLocation, setPreviousLocation] = useState(location);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close mobile drawer on location change
  useEffect(() => {
    if (location !== previousLocation) {
      setPreviousLocation(location);
      if (isMobile && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    }
  }, [location, previousLocation, isMobile, isMobileSidebarOpen]);

  // Don't show AppShell on auth pages or when feature flag is disabled
  if (!user || location === '/auth' || !featureFlags.chatwootLayout) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden" data-testid="chatwoot-app-shell">
      {/* Mobile Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-60 md:hidden"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileSidebarOpen(false);
          }}
        />
      )}
      
      {/* Responsive Left Sidebar - ~260px */}
      {(!isMobile || isMobileSidebarOpen) && (
        <aside className={`
          ${isMobile 
            ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative'
          } 
          w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
        `}>
          <SidebarNav 
            onMobileClose={() => {
                setIsMobileSidebarOpen(false);
            }}
            isMobile={isMobile}
          />
        </aside>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Hamburger Menu - Only show on mobile when sidebar is closed */}
        {isMobile && !isMobileSidebarOpen && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2"
              data-testid="mobile-menu-button"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        )}
        
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