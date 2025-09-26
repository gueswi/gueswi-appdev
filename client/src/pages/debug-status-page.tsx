import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useExtensions, useIvrs, useQueues, useRecordings } from "@/hooks/use-telephony";
import { Settings, User, Database, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function DebugStatusPage() {
  const { user, isLoading, refetch } = useAuth();
  const [baseUrl] = useState(window.location.origin);
  const [urlsHit, setUrlsHit] = useState<string[]>([]);

  // Telephony data queries (only if user has tenantId)
  const extensionsQuery = useExtensions();
  const ivrsQuery = useIvrs();
  const queuesQuery = useQueues();
  const recordingsQuery = useRecordings();

  const logApiCall = (url: string, status: number) => {
    const entry = `${url} → ${status}`;
    setUrlsHit(prev => [...prev, entry]);
  };

  // Log API calls by watching query states
  const getApiStatus = (query: any, endpoint: string) => {
    if (query.isLoading) return { status: "loading", color: "yellow" };
    if (query.error) return { status: "error", color: "red" };
    if (query.data !== undefined) return { status: "200", color: "green" };
    return { status: "pending", color: "gray" };
  };

  const StatusBadge = ({ status, color }: { status: string; color: string }) => {
    const Icon = status === "200" ? CheckCircle : status === "error" ? XCircle : AlertCircle;
    return (
      <Badge variant={color === "green" ? "default" : "secondary"} className="ml-2">
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Debug Status
          </h1>
          <p className="text-muted-foreground">
            Sistema de diagnóstico para verificar estado de sesión y APIs
          </p>
        </div>
        <Button 
          onClick={() => {
            refetch();
            setUrlsHit([]);
          }}
          data-testid="button-refresh"
        >
          Refresh Status
        </Button>
      </div>

      {/* WhoAmI Info */}
      <Card data-testid="card-whoami">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Usuario Actual (WhoAmI)
          </CardTitle>
          <CardDescription>Información de la sesión autenticada</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          ) : user ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ID:</span>
                  <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <span className="font-medium">Role:</span>
                  <Badge variant={user.role === "owner" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Tenant ID:</span>
                  {user.tenantId ? (
                    <p className="text-muted-foreground font-mono text-xs">{user.tenantId}</p>
                  ) : (
                    <Badge variant="destructive">No Tenant</Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No autenticado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card data-testid="card-api-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuración API
          </CardTitle>
          <CardDescription>URLs y configuración de endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Base URL:</span>
              <p className="text-muted-foreground font-mono text-sm">{baseUrl}</p>
            </div>
            <div>
              <span className="font-medium">WhoAmI Endpoint:</span>
              <p className="text-muted-foreground font-mono text-sm">{baseUrl}/api/whoami</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telephony Data Counts */}
      {user?.tenantId && (
        <Card data-testid="card-telephony-counts">
          <CardHeader>
            <CardTitle>Datos de Telefonía (Tenant: {user.tenantId.split('-')[0]}...)</CardTitle>
            <CardDescription>Counts de recursos para el tenant actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {extensionsQuery.isLoading ? "..." : extensionsQuery.data?.data?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Extensions</p>
                <StatusBadge {...getApiStatus(extensionsQuery, "/api/extensions")} />
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {ivrsQuery.isLoading ? "..." : ivrsQuery.data?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">IVR Menus</p>
                <StatusBadge {...getApiStatus(ivrsQuery, "/api/ivrs")} />
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {queuesQuery.isLoading ? "..." : queuesQuery.data?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Queues</p>
                <StatusBadge {...getApiStatus(queuesQuery, "/api/queues")} />
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {recordingsQuery.isLoading ? "..." : recordingsQuery.data?.data?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Recordings</p>
                <StatusBadge {...getApiStatus(recordingsQuery, "/api/recordings")} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Calls Log */}
      <Card data-testid="card-api-calls">
        <CardHeader>
          <CardTitle>API Calls Realizadas</CardTitle>
          <CardDescription>Últimas llamadas a la API con códigos de estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="text-sm space-y-1">
              <p className="font-mono">GET /api/whoami → {user ? "200" : "401"}</p>
              
              {user?.tenantId && (
                <>
                  <p className="font-mono">GET /api/extensions → {extensionsQuery.error ? "error" : extensionsQuery.data ? "200" : "loading"}</p>
                  <p className="font-mono">GET /api/ivrs → {ivrsQuery.error ? "error" : ivrsQuery.data ? "200" : "loading"}</p>
                  <p className="font-mono">GET /api/queues → {queuesQuery.error ? "error" : queuesQuery.data ? "200" : "loading"}</p>
                  <p className="font-mono">GET /api/recordings → {recordingsQuery.error ? "error" : recordingsQuery.data ? "200" : "loading"}</p>
                </>
              )}
              
              {urlsHit.map((url, index) => (
                <p key={index} className="font-mono text-muted-foreground">{url}</p>
              ))}
            </div>
            
            {!user?.tenantId && (
              <p className="text-sm text-muted-foreground italic">
                Telephony APIs requieren tenant activo
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}