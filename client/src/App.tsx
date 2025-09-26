import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SoftphoneProvider } from "@/components/softphone/softphone-provider";
import { ProtectedRoute } from "./lib/protected-route";
import { AppShell } from "@/layouts/AppShell";
import { featureFlags } from "@/lib/feature-flags";
import { Redirect } from "@/components/Redirect";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import DashboardPage from "@/pages/dashboard-page";
import InboxPage from "@/pages/inbox-page";
import SettingsPage from "@/pages/settings-page";
import TelephonySettingsPage from "@/pages/settings/telephony-settings-page";
import AISettingsPage from "@/pages/settings/ai-settings-page";
import ConsumptionSettingsPage from "@/pages/settings/consumption-settings-page";
import BillingSettingsPage from "@/pages/settings/billing-settings-page";
import TelephonyPage from "@/pages/telephony-page";
import TransferFormPage from "@/pages/transfer-form-page";
import AdminTransfersPage from "@/pages/admin-transfers-page";
import CheckoutPage from "@/pages/checkout-page";
import NotFound from "@/pages/not-found";

function Router() {
  const routes = (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      
      {/* New UI Routes */}
      <ProtectedRoute path="/inbox" component={InboxPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/settings/telephony" component={TelephonySettingsPage} />
      <ProtectedRoute path="/settings/ai" component={AISettingsPage} />
      <ProtectedRoute path="/settings/consumption" component={ConsumptionSettingsPage} />
      <ProtectedRoute path="/settings/billing" component={BillingSettingsPage} />
      
      {/* Legacy routes for backward compatibility */}
      <ProtectedRoute path="/telephony" component={featureFlags.enableNewUI ? 
        (() => <Redirect to="/settings/telephony" />) : TelephonyPage} />
      <ProtectedRoute path="/transfer-form" component={TransferFormPage} />
      <ProtectedRoute path="/admin/transfers" component={AdminTransfersPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      
      <Route component={NotFound} />
    </Switch>
  );

  // Conditionally wrap with AppShell based on feature flag
  if (featureFlags.enableNewUI) {
    return <AppShell>{routes}</AppShell>;
  }

  return routes;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SoftphoneProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SoftphoneProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
