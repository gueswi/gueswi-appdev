import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, Zap, TrendingUp } from "lucide-react";

export default function ConsumptionSettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="consumption-settings-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Consumo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitorea el uso de recursos y métricas de tu plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Métricas de Uso</span>
            </CardTitle>
            <CardDescription>
              Estadísticas detalladas de consumo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Próximamente: Métricas detalladas de uso de CPU, memoria y red
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Tiempo de Actividad</span>
            </CardTitle>
            <CardDescription>
              Monitoreo de disponibilidad del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Próximamente: Dashboard de tiempo de actividad y SLA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Rendimiento</span>
            </CardTitle>
            <CardDescription>
              Métricas de rendimiento y optimización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Próximamente: Análisis de rendimiento y recomendaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Tendencias</span>
            </CardTitle>
            <CardDescription>
              Análisis de tendencias de uso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Próximamente: Análisis predictivo y tendencias
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}