import { Link, useLocation } from "wouter";
import { 
  Inbox, 
  Search, 
  Activity, 
  Users, 
  Bot, 
  Settings,
  Phone,
  MessageSquare,
  Archive,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Inbox",
    href: "/inbox",
    icon: Inbox,
    badge: null,
    description: "Conversaciones"
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    badge: null,
    description: "Búsqueda global"
  },
  {
    name: "Activity",
    href: "/activity",
    icon: Activity,
    badge: null,
    description: "Timeline y notificaciones"
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
    badge: null,
    description: "Contactos"
  },
  {
    name: "Sona AI",
    href: "/sona-ai",
    icon: Bot,
    badge: "IA",
    description: "Agente de IA"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
    description: "Configuración"
  }
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col" data-testid="app-sidebar">
      {/* Logo and brand */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center space-x-2" data-testid="link-brand">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-white">Gueswi</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Virtual PBX</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative group",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              data-testid={`nav-${item.name.toLowerCase()}`}
            >
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
                  {item.badge}
                </span>
              )}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.description}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/profile"
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          data-testid="nav-profile"
        >
          <User className="w-5 h-5 mr-3" />
          <span>Mi Perfil</span>
        </Link>
      </div>
    </div>
  );
}