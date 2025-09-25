import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Check } from "lucide-react";
import { useLocation } from "wouter";
import PayPalButton from "@/components/PayPalButton";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_development_key";
const stripePromise = loadStripe(stripeKey);

const CheckoutForm = ({ planType }: { planType: "starter" | "growth" }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/dashboard',
      },
    });

    if (error) {
      toast({
        title: "Error en el pago",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Pago exitoso!",
        description: "Tu suscripción ha sido activada correctamente.",
      });
      setLocation('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="stripe-checkout-form">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe} 
        className="w-full"
        data-testid="button-stripe-submit"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Pagar con tarjeta
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth">("growth");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription", { plan: selectedPlan })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }
        return data;
      })
      .then((data) => {
        if (data.mock) {
          setIsDevelopmentMode(true);
          toast({
            title: "Development Mode",
            description: "Payment processing is disabled. Configure Stripe API keys to test payments.",
            variant: "default",
          });
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((error) => {
        console.error("Error creating subscription:", error);
        setIsDevelopmentMode(true);
        toast({
          title: "Configuration Error",
          description: error.message || "Failed to initialize payment. Please check your configuration.",
          variant: "destructive",
        });
      });
  }, [selectedPlan]);

  const plans = {
    starter: {
      name: "Starter",
      price: 15,
      features: [
        "Hasta 10 extensiones",
        "1000 minutos incluidos",
        "IA básica",
        "Soporte email"
      ]
    },
    growth: {
      name: "Growth",
      price: 25,
      features: [
        "Extensiones ilimitadas",
        "5000 minutos incluidos",
        "IA avanzada",
        "Soporte prioritario"
      ]
    }
  };

  if (!clientSecret && paymentMethod === "stripe" && !isDevelopmentMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/onboarding')}
            className="mb-4"
            data-testid="button-back-onboarding"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al onboarding
          </Button>
          <h1>Finalizar suscripción</h1>
          <p className="text-muted-foreground">Completa tu pago para activar tu plan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-6">
            <h2>Selecciona tu plan</h2>
            
            <div className="space-y-4" data-testid="plan-selection">
              {Object.entries(plans).map(([key, plan]) => (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === key ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlan(key as "starter" | "growth")}
                  data-testid={`plan-${key}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3>{plan.name}</h3>
                        {key === "growth" && (
                          <Badge className="bg-primary text-primary-foreground">Recomendado</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/mes</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-6">
            <h2>Método de pago</h2>

            {/* Payment Method Selection */}
            <div className="space-y-4" data-testid="payment-methods">
              <Card 
                className={`cursor-pointer transition-all ${
                  paymentMethod === "stripe" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("stripe")}
                data-testid="payment-stripe"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" style={{ opacity: paymentMethod === "stripe" ? 1 : 0.3 }} />
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Tarjeta de crédito</div>
                      <div className="text-sm text-muted-foreground">Visa, Mastercard, American Express</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  paymentMethod === "paypal" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                }`}
                onClick={() => setPaymentMethod("paypal")}
                data-testid="payment-paypal"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" style={{ opacity: paymentMethod === "paypal" ? 1 : 0.3 }} />
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">P</div>
                    <div>
                      <div className="font-medium">PayPal</div>
                      <div className="text-sm text-muted-foreground">Pago seguro con PayPal</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <Card data-testid="payment-form">
              <CardContent className="p-6">
                <h3 className="mb-4">Datos de pago</h3>
                
                {paymentMethod === "stripe" && isDevelopmentMode ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg" data-testid="development-mode-notice">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <h4 className="font-medium text-amber-800">Development Mode</h4>
                    </div>
                    <p className="text-sm text-amber-700 mb-3">
                      Payment processing is currently disabled because Stripe API keys are not configured.
                    </p>
                    <p className="text-xs text-amber-600">
                      To test payments, configure STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY environment variables.
                    </p>
                  </div>
                ) : paymentMethod === "stripe" && clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm planType={selectedPlan} />
                  </Elements>
                ) : paymentMethod === "paypal" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Serás redirigido a PayPal para completar tu pago de forma segura.
                    </p>
                    <PayPalButton
                      amount={plans[selectedPlan].price.toString()}
                      currency="USD"
                      intent="subscription"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Cargando formulario de pago...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card data-testid="order-summary">
              <CardContent className="p-6">
                <h3 className="mb-4">Resumen del pedido</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Plan {plans[selectedPlan].name}</span>
                    <span>${plans[selectedPlan].price}/mes</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Impuestos</span>
                    <span>Incluidos</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total mensual</span>
                      <span>${plans[selectedPlan].price}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
