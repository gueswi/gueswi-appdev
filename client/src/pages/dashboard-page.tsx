import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { OmnichannelInbox } from "@/components/conversations/omnichannel-inbox";
import { 
  Phone, 
  PhoneCall, 
  Bot, 
  BarChart3, 
  Users, 
  DollarSign, 
  PhoneIncoming, 
  Clock, 
  Mic, 
  Filter, 
  Plus,
  Zap,
  Download,
  CreditCard,
  Settings,
  MessageSquare
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DashboardStats {
  activeCalls: number;
  aiMinutes: number;
  extensions: number;
  monthlyCost: number;
}

interface ConsumptionData {
  voiceMinutes: any[];
  aiMinutes: any[];
}

interface ExtensionsResponse {
  data: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive';
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface IVRsResponse {
  data: Array<{
    id: string;
    name: string;
  }>;
  callsToday: number;
}

interface QueuesResponse {
  data: Array<{
    id: string;
    name: string;
  }>;
  waiting: number;
  avgWaitTime: string;
}

interface RecordingsResponse {
  data: Array<{
    id: string;
    filename: string;
  }>;
  last24h: number;
  storageUsed: string;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("telefonia");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle URL query parameters for tab switching
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['telefonia', 'conversaciones', 'ia', 'consumo', 'facturacion'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Handle tab change and update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  };

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch consumption data
  const { data: consumptionData } = useQuery<ConsumptionData>({
    queryKey: ["/api/dashboard/consumption"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Extensions query
  const { data: extensions } = useQuery<ExtensionsResponse>({
    queryKey: ["/api/extensions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // IVRs query
  const { data: ivrs } = useQuery<IVRsResponse>({
    queryKey: ["/api/ivrs"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Queues query
  const { data: queues } = useQuery<QueuesResponse>({
    queryKey: ["/api/queues"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Recordings query
  const { data: recordings } = useQuery<RecordingsResponse>({
    queryKey: ["/api/recordings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // AI metrics query
  const { data: aiMetrics } = useQuery({
    queryKey: ["/api/ai/metrics"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="dashboard-stats">
        <MetricCard
          title="Llamadas Activas"
          value={stats?.activeCalls || 0}
          trend="+12% vs ayer"
          icon={PhoneCall}
          iconColor="text-primary"
        />
        <MetricCard
          title="Minutos IA"
          value={stats?.aiMinutes || 0}
          trend="-5% vs ayer"
          icon={Bot}
          iconColor="text-accent-foreground"
        />
        <MetricCard
          title="Extensiones"
          value={stats?.extensions || 0}
          trend="+2 nuevas"
          icon={Users}
          iconColor="text-secondary-foreground"
        />
        <MetricCard
          title="Gasto Mensual"
          value={`$${stats?.monthlyCost || 0}`}
          subtitle="Plan Growth"
          icon={DollarSign}
          iconColor="text-green-600"
        />
      </div>

      {/* Tabs Navigation */}
      <Card className="p-2 mb-8" data-testid="dashboard-tabs">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 bg-transparent gap-2">
            <TabsTrigger 
              value="telefonia" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-telefonia"
            >
              <Phone className="w-4 h-4 mr-2" />
              Telefonía
            </TabsTrigger>
            <TabsTrigger 
              value="conversaciones" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-conversaciones"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversaciones
            </TabsTrigger>
            <TabsTrigger 
              value="ia" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-ia"
            >
              <Bot className="w-4 h-4 mr-2" />
              IA
            </TabsTrigger>
            <TabsTrigger 
              value="consumo" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-consumo"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Consumo
            </TabsTrigger>
            <TabsTrigger 
              value="facturacion" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-facturacion"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Facturación
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Telefonía */}
          <TabsContent value="telefonia" className="mt-6" data-testid="telefonia-content">
            {/* Filter Bar */}
            <Card className="p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las extensiones</SelectItem>
                      <SelectItem value="active">Solo activas</SelectItem>
                      <SelectItem value="inactive">Solo inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="day">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Último día</SelectItem>
                      <SelectItem value="week">Última semana</SelectItem>
                      <SelectItem value="month">Último mes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setLocation('/telephony?action=new-extension')}
                    data-testid="button-new-extension"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Extensión
                  </Button>
                </div>
              </div>
            </Card>

            {/* Telephony Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="telephony-grid">
              {/* Extensions Card */}
              <Card data-testid="card-extensions">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4>Extensiones</h4>
                      <p className="text-sm text-muted-foreground">Gestión de usuarios</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Activas</span>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {extensions?.data?.filter((ext: any) => ext.status === 'active').length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Inactivas</span>
                      <Badge className="bg-amber-100 text-amber-700">
                        {extensions?.data?.filter((ext: any) => ext.status === 'inactive').length || 0}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setLocation('/telephony?tab=extensions')}
                      data-testid="button-view-extensions"
                    >
                      Ver detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* IVR Card */}
              <Card data-testid="card-ivr">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                      <PhoneIncoming className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h4>IVR</h4>
                      <p className="text-sm text-muted-foreground">Menú automático</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Configurados</span>
                      <Badge className="bg-emerald-100 text-emerald-700">{ivrs?.data?.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Llamadas hoy</span>
                      <span className="text-sm font-medium">{ivrs?.callsToday || 0}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setLocation('/telephony?tab=ivrs')}
                      data-testid="button-configure-ivr"
                    >
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Call Queues Card */}
              <Card data-testid="card-queues">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h4>Colas</h4>
                      <p className="text-sm text-muted-foreground">Espera de llamadas</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">En espera</span>
                      <Badge className="bg-amber-100 text-amber-700">{queues?.waiting || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tiempo promedio</span>
                      <span className="text-sm font-medium">{queues?.avgWaitTime || '0:00'}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setLocation('/telephony?tab=queues')}
                      data-testid="button-manage-queues"
                    >
                      Gestionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recordings Card */}
              <Card data-testid="card-recordings">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Mic className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4>Grabaciones</h4>
                      <p className="text-sm text-muted-foreground">Archivo de llamadas</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Últimas 24h</span>
                      <span className="text-sm font-medium">{recordings?.last24h || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Almacenamiento</span>
                      <span className="text-sm font-medium">{recordings?.storageUsed || '0 GB'}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setLocation('/telephony?tab=recordings')}
                      data-testid="button-play-recordings"
                    >
                      Reproducir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Content: Conversaciones */}
          <TabsContent value="conversaciones" className="mt-6" data-testid="conversaciones-content">
            <OmnichannelInbox />
          </TabsContent>

          {/* Tab Content: IA */}
          <TabsContent value="ia" className="mt-6" data-testid="ia-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* IA Configuration */}
              <Card data-testid="ia-config">
                <CardContent className="p-6">
                  <h3 className="mb-6">Configuración de IA</h3>
                  
                  <div className="space-y-6">
                    {/* AI Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Asistente IA</Label>
                        <p className="text-sm text-muted-foreground">Activar respuesta automática</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-ai-assistant" />
                    </div>

                    {/* Barge-in Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Barge-in</Label>
                        <p className="text-sm text-muted-foreground">Interrupción inteligente</p>
                      </div>
                      <Switch data-testid="switch-barge-in" />
                    </div>

                    {/* Language Selection */}
                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <Select defaultValue="es">
                        <SelectTrigger data-testid="select-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español (ES)</SelectItem>
                          <SelectItem value="en">English (EN)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Voice Speed */}
                    <div className="space-y-2">
                      <Label>Velocidad de voz</Label>
                      <div className="space-y-2">
                        <Slider 
                          defaultValue={[1]} 
                          max={2} 
                          min={0.5} 
                          step={0.1} 
                          className="w-full"
                          data-testid="slider-voice-speed"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Lenta</span>
                          <span>Velocidad actual: 1.0x</span>
                          <span>Rápida</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* IA Metrics */}
              <Card data-testid="ia-metrics">
                <CardContent className="p-6">
                  <h3 className="mb-6">Métricas de IA</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Segundos hablados hoy</span>
                        <span className="font-bold">2,340s</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{width: "65%"}}></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Coste estimado</span>
                        <span className="font-bold">$3.50</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-accent-foreground h-2 rounded-full" style={{width: "35%"}}></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Llamadas atendidas</span>
                        <span className="font-bold">127</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Exitosas</span>
                        <span>89%</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Uso semanal</span>
                        <span className="text-xs text-muted-foreground">Últimos 7 días</span>
                      </div>
                      {/* Simple chart representation */}
                      <div className="flex items-end gap-1 h-20">
                        <div className="bg-primary/30 w-full" style={{height: "40%"}}></div>
                        <div className="bg-primary/50 w-full" style={{height: "60%"}}></div>
                        <div className="bg-primary/70 w-full" style={{height: "80%"}}></div>
                        <div className="bg-primary w-full" style={{height: "100%"}}></div>
                        <div className="bg-primary/80 w-full" style={{height: "75%"}}></div>
                        <div className="bg-primary/60 w-full" style={{height: "55%"}}></div>
                        <div className="bg-primary/40 w-full" style={{height: "45%"}}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Content: Consumo */}
          <TabsContent value="consumo" className="mt-6" data-testid="consumo-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Voice Usage Chart */}
              <Card data-testid="voice-usage-chart">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3>Consumo de Voz</h3>
                    <Select defaultValue="30days">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30days">Últimos 30 días</SelectItem>
                        <SelectItem value="7days">Últimos 7 días</SelectItem>
                        <SelectItem value="year">Último año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Chart placeholder */}
                  <EmptyState
                    icon={BarChart3}
                    title="Gráfico de consumo de voz"
                    description="Implementar con Recharts"
                  />
                  
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold">4,567 min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Promedio/día</p>
                      <p className="font-bold">152 min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pico</p>
                      <p className="font-bold">287 min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Usage Chart */}
              <Card data-testid="ai-usage-chart">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3>Consumo de IA</h3>
                    <Select defaultValue="30days">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30days">Últimos 30 días</SelectItem>
                        <SelectItem value="7days">Últimos 7 días</SelectItem>
                        <SelectItem value="year">Último año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Chart placeholder */}
                  <EmptyState
                    icon={Bot}
                    title="Gráfico de consumo de IA"
                    description="Implementar con Recharts"
                  />
                  
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold">1,234 min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Promedio/día</p>
                      <p className="font-bold">41 min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Coste</p>
                      <p className="font-bold">$45.60</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Content: Facturación */}
          <TabsContent value="facturacion" className="mt-6" data-testid="facturacion-content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Current Plan */}
              <Card data-testid="current-plan">
                <CardContent className="p-6">
                  <h3 className="mb-6">Plan actual</h3>
                  
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h4>Growth</h4>
                    <p className="text-2xl font-bold">$25<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-sm">Extensiones ilimitadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-sm">5000 minutos incluidos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-sm">IA avanzada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-sm">Soporte prioritario</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">Cambiar plan</Button>
                    <Button variant="outline" className="w-full text-destructive">Cancelar suscripción</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card data-testid="payment-method">
                <CardContent className="p-6">
                  <h3 className="mb-6">Método de pago</h3>
                  
                  <div className="flex items-center gap-4 p-4 border border-border rounded-lg mb-6">
                    <div className="w-12 h-8 bg-primary rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expira 12/25</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">Activa</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Próximo cobro</span>
                      <span className="font-medium">15 Feb 2024</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Estado</span>
                      <Badge className="bg-emerald-100 text-emerald-700">Al día</Badge>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-6">Actualizar método</Button>
                </CardContent>
              </Card>

              {/* Usage This Month */}
              <Card data-testid="usage-month">
                <CardContent className="p-6">
                  <h3 className="mb-6">Uso este mes</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Minutos incluidos</span>
                        <span className="text-sm font-medium">3,456 / 5,000</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{width: "69%"}}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Extensiones</span>
                        <span className="text-sm font-medium">12 / ∞</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-accent-foreground h-2 rounded-full" style={{width: "30%"}}></div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cargos adicionales</span>
                        <span className="text-sm font-medium">$0.00</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setLocation('/transfer-form')}
                    className="w-full mt-6"
                    data-testid="button-buy-pack"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Comprar pack adicional
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </DashboardLayout>
  );
}
