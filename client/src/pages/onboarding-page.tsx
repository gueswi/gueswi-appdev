import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, CreditCard, Smartphone, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTenantSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const onboardingSchema = insertTenantSchema.extend({
  selectedPlan: z.enum(["starter", "growth"]),
  paymentMethod: z.enum(["stripe", "paypal", "transfer"]),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      industry: "",
      employeeCount: "",
      estimatedExtensions: 10,
      selectedPlan: "growth",
      paymentMethod: "stripe",
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const { selectedPlan, paymentMethod, ...tenantData } = data;
      const res = await apiRequest("POST", "/api/complete-onboarding", {
        tenantData,
        selectedPlan,
        paymentMethod,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Configuración completada!",
        description: "Tu cuenta ha sido configurada correctamente.",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la configuración",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    setLocation('/auth');
    return null;
  }

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = (data: OnboardingFormData) => {
    completeOnboardingMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" data-testid="onboarding-page">
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8" data-testid="onboarding-progress">
          <div className="flex items-center justify-between mb-4">
            <h2>Configuración inicial</h2>
            <span className="text-sm text-muted-foreground">
              Paso <span data-testid="current-step">{currentStep}</span> de 3
            </span>
          </div>
          <div className="flex gap-2">
            <div className={`flex-1 h-2 rounded ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`flex-1 h-2 rounded ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`flex-1 h-2 rounded ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleComplete)}>
          {/* Step 1: Account Setup */}
          {currentStep === 1 && (
            <Card data-testid="onboarding-step-1">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3>Información de la cuenta</h3>
                  <p className="text-muted-foreground">Tu perfil personal ya está configurado</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={user.firstName || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input value={user.lastName || ""} disabled />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={user.phone || ""} disabled />
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setLocation('/auth')}
                      data-testid="button-back-to-auth"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1"
                      onClick={nextStep}
                      data-testid="button-next-step1"
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Company Setup */}
          {currentStep === 2 && (
            <Card data-testid="onboarding-step-2">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3>Información de la empresa</h3>
                  <p className="text-muted-foreground">Configura los datos de tu organización</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nombre de la empresa</Label>
                    <Input 
                      id="companyName"
                      placeholder="Mi Empresa S.A."
                      {...form.register("name")}
                      data-testid="input-company-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industria</Label>
                    <Select onValueChange={(value) => form.setValue("industry", value)}>
                      <SelectTrigger data-testid="select-industry">
                        <SelectValue placeholder="Selecciona tu industria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Tecnología</SelectItem>
                        <SelectItem value="services">Servicios</SelectItem>
                        <SelectItem value="manufacturing">Manufactura</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.industry && (
                      <p className="text-sm text-destructive">{form.formState.errors.industry.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employees">Número de empleados</Label>
                    <Select onValueChange={(value) => form.setValue("employeeCount", value)}>
                      <SelectTrigger data-testid="select-employees">
                        <SelectValue placeholder="Selecciona el tamaño" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="200+">200+</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.employeeCount && (
                      <p className="text-sm text-destructive">{form.formState.errors.employeeCount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extensions">Extensiones estimadas</Label>
                    <Input 
                      id="extensions"
                      type="number"
                      placeholder="10"
                      {...form.register("estimatedExtensions", { valueAsNumber: true })}
                      data-testid="input-extensions"
                    />
                    {form.formState.errors.estimatedExtensions && (
                      <p className="text-sm text-destructive">{form.formState.errors.estimatedExtensions.message}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={prevStep}
                      data-testid="button-prev-step2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1"
                      onClick={nextStep}
                      data-testid="button-next-step2"
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Setup */}
          {currentStep === 3 && (
            <Card data-testid="onboarding-step-3">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3>Configuración de pago</h3>
                  <p className="text-muted-foreground">Selecciona tu plan y método de pago</p>
                </div>

                {/* Plan Selection */}
                <div className="mb-8">
                  <h4 className="mb-4">Selecciona tu plan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="plan-selection">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        form.watch("selectedPlan") === "starter" ? "border-primary bg-primary/5" : "border-muted hover:border-primary"
                      }`}
                      onClick={() => form.setValue("selectedPlan", "starter")}
                      data-testid="plan-starter-select"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4>Starter</h4>
                        <span className="font-bold">$15/mes</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Hasta 10 extensiones</li>
                        <li>• 1000 minutos incluidos</li>
                        <li>• IA básica</li>
                      </ul>
                    </div>
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        form.watch("selectedPlan") === "growth" ? "border-primary bg-primary/5" : "border-muted hover:border-primary"
                      }`}
                      onClick={() => form.setValue("selectedPlan", "growth")}
                      data-testid="plan-growth-select"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4>Growth</h4>
                        <span className="font-bold">$25/mes</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Extensiones ilimitadas</li>
                        <li>• 5000 minutos incluidos</li>
                        <li>• IA avanzada</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-8">
                  <h4 className="mb-4">Método de pago</h4>
                  <div className="space-y-4" data-testid="payment-methods">
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      form.watch("paymentMethod") === "stripe" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                    }`}>
                      <input 
                        type="radio" 
                        value="stripe" 
                        {...form.register("paymentMethod")}
                        data-testid="payment-stripe"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Tarjeta de crédito</div>
                        <div className="text-sm text-muted-foreground">Visa, Mastercard, American Express</div>
                      </div>
                      <CreditCard className="w-6 h-6 text-muted-foreground" />
                    </label>
                    
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      form.watch("paymentMethod") === "paypal" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                    }`}>
                      <input 
                        type="radio" 
                        value="paypal" 
                        {...form.register("paymentMethod")}
                        data-testid="payment-paypal"
                      />
                      <div className="flex-1">
                        <div className="font-medium">PayPal</div>
                        <div className="text-sm text-muted-foreground">Pago seguro con PayPal</div>
                      </div>
                      <Smartphone className="w-6 h-6 text-muted-foreground" />
                    </label>
                    
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      form.watch("paymentMethod") === "transfer" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                    }`}>
                      <input 
                        type="radio" 
                        value="transfer" 
                        {...form.register("paymentMethod")}
                        data-testid="payment-transfer"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Transferencia bancaria (VE)</div>
                        <div className="text-sm text-muted-foreground">Pago manual con comprobante</div>
                      </div>
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={prevStep}
                    data-testid="button-prev-step3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={completeOnboardingMutation.isPending}
                    data-testid="button-complete-onboarding"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {completeOnboardingMutation.isPending ? 'Configurando...' : 'Completar configuración'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
