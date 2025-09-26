import { useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home,
  Inbox, 
  Search, 
  Activity, 
  Users, 
  MessageSquare, 
  Phone, 
  BarChart3, 
  Bot, 
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarNavProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
}

/**
 * Sidebar Navigation Component
 * Implements Chatwoot-style sidebar with sections:
 * - Workspace
 * - Primary Navigation (Inbox, Search, Activity, etc.)
 * - Tools (Sona AI)
 * - Settings
 * Enhanced with responsive mobile support
 */
export function SidebarNav({ onMobileClose, isMobile = false }: SidebarNavProps) {
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  // Reset collapsed state when switching to mobile to prevent stuck drawer
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(false);
    }
  }, [isMobile]);

  // Define navigation sections as per requirements
  const navSections: NavSection[] = [
    {
      title: "Your workspace",
      items: [
        { name: "Home", href: "/", icon: Home },
      ]
    },
    {
      title: "Inboxes",
      items: [
        { name: "Inbox", href: "/inbox", icon: Inbox },
        { name: "Search", href: "/search", icon: Search },
        { name: "Activity", href: "/activity", icon: Activity },
        { name: "Contacts", href: "/contacts", icon: Users },
        { name: "Conversations", href: "/conversations", icon: MessageSquare },
        { name: "Calls", href: "/calls", icon: Phone },
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
      ]
    },
    {
      title: "Tools",
      items: [
        { name: "Sona AI", href: "/ai", icon: Bot },
      ]
    },
    {
      title: "Settings",
      items: [
        { name: "Settings", href: "/settings", icon: Settings },
      ]
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">Gueswi</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            )}
          </div>
          
          {/* Mobile close button */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="sm"
              className="w-6 h-6 p-0"
              onClick={onMobileClose}
              data-testid="mobile-close-button"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {/* Desktop collapse button - always visible on desktop */}
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="sm"
              className="w-6 h-6 p-0 flex-shrink-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-testid="desktop-collapse-button"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section Title */}
            {!isCollapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => (
                isMobile ? (
                  <a 
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      isActive(item.href) 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onMobileClose) {
                        onMobileClose();
                        // Navigate after state update
                        setTimeout(() => {
                          setLocation(item.href);
                        }, 50);
                      }
                    }}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isCollapsed ? "mx-auto" : "mr-3"
                    )} />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        "hover:bg-gray-100 dark:hover:bg-gray-700",
                        isActive(item.href) 
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isCollapsed ? "mx-auto" : "mr-3"
                      )} />
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </Link>
                )
              ))}
            </div>
            
            {/* Separator between sections */}
            {sectionIndex < navSections.length - 1 && !isCollapsed && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </nav>

    </div>
  );
}