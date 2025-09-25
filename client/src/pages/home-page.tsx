import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layouts/navbar";
import { Phone, PhoneCall, Bot, BarChart3, Play, Calendar, Check } from "lucide-react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50" data-testid="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16" data-testid="hero-section">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Centralita Virtual con IA
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="hero-description">
            Transforma tu comunicación empresarial con nuestra plataforma PBX inteligente. 
            Gestión avanzada de llamadas, IVR automático y analítica en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setLocation('/auth')} 
              className="px-8 py-3 rounded-full"
              data-testid="button-start-free"
            >
              <Play className="w-5 h-5 mr-2" />
              Comenzar Gratis
            </Button>
            <Button 
              variant="outline" 
              className="px-8 py-3 rounded-full"
              data-testid="button-request-demo"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Solicitar Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16" data-testid="features-grid">
          {/* Feature 1: PBX Inteligente */}
          <Card data-testid="feature-pbx">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                <PhoneCall className="w-8 h-8 text-primary" />
              </div>
              <h3 className="mb-4">PBX Inteligente</h3>
              <p className="text-muted-foreground mb-6">
                Centralita virtual completa con enrutamiento inteligente, 
                gestión de extensiones y grabación automática de llamadas.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Extensiones ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  IVR personalizable
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Grabación automática
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 2: IA Conversacional */}
          <Card data-testid="feature-ai">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="mb-4">IA Conversacional</h3>
              <p className="text-muted-foreground mb-6">
                Asistente virtual avanzado con procesamiento de lenguaje natural 
                para atender llamadas automáticamente 24/7.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Reconocimiento de voz
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Respuestas contextuales
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Transferencia inteligente
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 3: Analítica Avanzada */}
          <Card data-testid="feature-analytics">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="mb-4">Analítica Avanzada</h3>
              <p className="text-muted-foreground mb-6">
                Dashboard completo con métricas en tiempo real, 
                reportes detallados y análisis de rendimiento.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Métricas en tiempo real
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Reportes personalizados
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Alertas automáticas
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Section */}
        <div className="text-center mb-16" data-testid="pricing-section">
          <h2 className="mb-8">Planes flexibles para tu empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter Plan */}
            <Card data-testid="plan-starter">
              <CardContent className="p-8 relative">
                <div className="mb-6">
                  <h3 className="mb-2">Starter</h3>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-bold">$15</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Hasta 10 extensiones
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    1000 minutos incluidos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    IA básica
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Soporte email
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full rounded-full"
                  onClick={() => setLocation('/auth')}
                  data-testid="button-plan-starter"
                >
                  Comenzar
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan */}
            <Card className="border-2 border-primary" data-testid="plan-growth">
              <CardContent className="p-8 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                    Recomendado
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="mb-2">Growth</h3>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-bold">$25</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Extensiones ilimitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    5000 minutos incluidos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    IA avanzada
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Soporte prioritario
                  </li>
                </ul>
                <Button 
                  className="w-full rounded-full"
                  onClick={() => setLocation('/auth')}
                  data-testid="button-plan-growth"
                >
                  Comenzar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
