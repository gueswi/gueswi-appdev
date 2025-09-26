import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SoftphoneProvider } from "@/components/softphone/softphone-provider";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import DashboardPage from "@/pages/dashboard-page";
import TelephonyPage from "@/pages/telephony-page";
import TransferFormPage from "@/pages/transfer-form-page";
import AdminTransfersPage from "@/pages/admin-transfers-page";
import CheckoutPage from "@/pages/checkout-page";
import ConversationsPage from "@/pages/conversations-page";
import ConversationDetailPage from "@/pages/conversation-detail-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/dashboard/conversaciones/:id" component={ConversationDetailPage} />
      <ProtectedRoute path="/dashboard/conversaciones" component={ConversationsPage} />
      <ProtectedRoute path="/telephony" component={TelephonyPage} />
      <ProtectedRoute path="/transfer-form" component={TransferFormPage} />
      <ProtectedRoute path="/admin/transfers" component={AdminTransfersPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      <Route component={NotFound} />
    </Switch>
  );
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
