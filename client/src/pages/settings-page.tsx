import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Phone, 
  Bot, 
  BarChart3, 
  CreditCard, 
  Users, 
  Puzzle,
  Settings,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const settingsCategories = [
  {
    id: 'telephony',
    title: 'Telefonía',
    description: 'Extensiones, IVR, colas y grabaciones',
    icon: Phone,
    href: '/settings/telephony',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
  },
  {
    id: 'ai',
    title: 'Inteligencia Artificial',
    description: 'Agentes IA, prompts y configuración TTS',
    icon: Bot,
    href: '/settings/ai',
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
  },
  {
    id: 'consumption',
    title: 'Consumo',
    description: 'Métricas de uso y límites',
    icon: BarChart3,
    href: '/settings/consumption',
    color: 'bg-green-50 text-green-600 dark:bg-green-900 dark:text-green-300'
  },
  {
    id: 'billing',
    title: 'Facturación',
    description: 'Planes, pagos y facturas',
    icon: CreditCard,
    href: '/settings/billing',
    color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
  },
  {
    id: 'teams',
    title: 'Equipos',
    description: 'Usuarios, roles y permisos',
    icon: Users,
    href: '/settings/teams',
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
  },
  {
    id: 'integrations',
    title: 'Integraciones',
    description: 'Conectores y APIs externas',
    icon: Puzzle,
    href: '/settings/integrations',
    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
  }
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra todas las configuraciones de tu plataforma Gueswi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          
          return (
            <Card key={category.id} className="group hover:shadow-md transition-shadow cursor-pointer">
              <Link href={category.href} className="block" data-testid={`link-settings-${category.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", category.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Acciones Rápidas</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/settings/telephony"
            className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            data-testid="quick-action-new-extension"
          >
            <Phone className="w-4 h-4 text-blue-600" />
            <span>Nueva Extensión</span>
          </Link>
          <Link
            href="/settings/ai"
            className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            data-testid="quick-action-configure-ai"
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span>Configurar IA</span>
          </Link>
          <Link
            href="/settings/billing"
            className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            data-testid="quick-action-view-billing"
          >
            <CreditCard className="w-4 h-4 text-yellow-600" />
            <span>Ver Facturación</span>
          </Link>
        </div>
      </div>
    </div>
  );
}