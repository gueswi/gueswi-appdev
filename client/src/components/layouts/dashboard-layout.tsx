import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="dashboard-layout">
      <Navbar />
      
      {/* Dashboard Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border" data-testid="dashboard-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1>Dashboard</h1>
              <p className="text-muted-foreground" data-testid="dashboard-welcome">
                Bienvenido de vuelta, {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
