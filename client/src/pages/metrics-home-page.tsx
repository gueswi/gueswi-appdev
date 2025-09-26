import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { 
  PhoneCall, 
  Bot, 
  Users, 
  DollarSign, 
  PhoneIncoming,
  Clock,
  Mic,
  BarChart3,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface DashboardStats {
  activeCalls: number;
  aiMinutes: number;
  extensions: number;
  monthlyCost: number;
}

interface ActivityStats {
  incomingCalls: number;
  waitingCalls: number;
  recordingsToday: number;
  satisfactionScore: number;
}

/**
 * New Metrics-Only Home Page for Chatwoot Layout
 * Shows only KPIs and key metrics - no tabs or configuration
 */
export default function MetricsHomePage() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch activity stats
  const { data: activity, isLoading: activityLoading } = useQuery<ActivityStats>({
    queryKey: ["/api/dashboard/activity"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (statsLoading || activityLoading) {
    return (
      <div className="space-y-6" data-testid="metrics-home-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="metrics-home">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Panel de Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de actividad y métricas clave de tu centralita virtual
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="primary-kpis">
        <MetricCard
          title="Llamadas Activas"
          value={stats?.activeCalls || 0}
          trend="+12% vs ayer"
          icon={PhoneCall}
          iconColor="text-blue-600"
          data-testid="metric-active-calls"
        />
        <MetricCard
          title="Minutos IA"
          value={stats?.aiMinutes || 0}
          trend="-5% vs ayer"
          icon={Bot}
          iconColor="text-purple-600"
          data-testid="metric-ai-minutes"
        />
        <MetricCard
          title="Extensiones"
          value={stats?.extensions || 0}
          trend="+2 nuevas"
          icon={Users}
          iconColor="text-green-600"
          data-testid="metric-extensions"
        />
        <MetricCard
          title="Gasto Mensual"
          value={`$${stats?.monthlyCost || 0}`}
          subtitle="Plan Growth"
          icon={DollarSign}
          iconColor="text-emerald-600"
          data-testid="metric-monthly-cost"
        />
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="activity-metrics">
        <MetricCard
          title="Llamadas Entrantes"
          value={activity?.incomingCalls || 0}
          trend="Hoy"
          icon={PhoneIncoming}
          iconColor="text-indigo-600"
          data-testid="metric-incoming-calls"
        />
        <MetricCard
          title="En Espera"
          value={activity?.waitingCalls || 0}
          trend="Ahora"
          icon={Clock}
          iconColor="text-orange-600"
          data-testid="metric-waiting-calls"
        />
        <MetricCard
          title="Grabaciones"
          value={activity?.recordingsToday || 0}
          trend="Hoy"
          icon={Mic}
          iconColor="text-red-600"
          data-testid="metric-recordings"
        />
        <MetricCard
          title="Satisfacción"
          value={`${activity?.satisfactionScore || 0}%`}
          trend="Promedio"
          icon={BarChart3}
          iconColor="text-teal-600"
          data-testid="metric-satisfaction"
        />
      </div>

      {/* Performance Overview */}
      <Card data-testid="performance-overview">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Resumen de Rendimiento</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">Últimas 24 horas</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Call Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volumen de Llamadas</span>
                <div className="flex items-center text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">+15%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{width: "75%"}}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">342 llamadas procesadas</div>
            </div>

            {/* AI Efficiency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Eficiencia IA</span>
                <div className="flex items-center text-red-600">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span className="text-sm">-3%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{width: "88%"}}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">88% resolución automática</div>
            </div>

            {/* Response Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tiempo de Respuesta</span>
                <div className="flex items-center text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">+8%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{width: "92%"}}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Promedio: 1.2 segundos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card data-testid="quick-actions">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <PhoneCall className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium mb-1">Llamadas</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ver historial y estadísticas</p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Bot className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium mb-1">Sona AI</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Configurar asistente virtual</p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <BarChart3 className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-medium mb-1">Analytics</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Reportes detallados</p>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <Users className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-sm font-medium mb-1">Contactos</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Gestionar clientes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}