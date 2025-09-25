import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Filter, 
  Clock, 
  Check, 
  X, 
  MessageCircle, 
  FileImage, 
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BankTransfer } from "@shared/schema";

export default function AdminTransfersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending transfers
  const { data: transfers, isLoading } = useQuery<BankTransfer[]>({
    queryKey: ["/api/bank-transfers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateTransferMutation = useMutation({
    mutationFn: async ({ id, status, adminComments }: { 
      id: string; 
      status: "approved" | "rejected"; 
      adminComments?: string; 
    }) => {
      const res = await apiRequest("PATCH", `/api/bank-transfers/${id}`, {
        status,
        adminComments,
      });
      return res.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "approved" ? "Transferencia aprobada" : "Transferencia rechazada",
        description: status === "approved" 
          ? "La transferencia ha sido aprobada y el saldo acreditado."
          : "La transferencia ha sido rechazada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transfers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al procesar transferencia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (transferId: string) => {
    updateTransferMutation.mutate({ 
      id: transferId, 
      status: "approved" 
    });
  };

  const handleReject = (transferId: string) => {
    const reason = prompt('Motivo del rechazo:');
    if (reason) {
      updateTransferMutation.mutate({ 
        id: transferId, 
        status: "rejected", 
        adminComments: reason 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingTransfers = transfers?.filter(t => t.status === "pending") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="admin-transfers-page">
      {/* Admin Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border" data-testid="admin-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1>Administración - Transferencias</h1>
              <p className="text-muted-foreground">Gestión de transferencias bancarias pendientes</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-700 px-3 py-2 rounded-full" data-testid="pending-count">
                {pendingTransfers.length} pendientes
              </Badge>
              <Button 
                variant="outline"
                onClick={() => setLocation('/dashboard')}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Bar */}
        <Card className="p-4 mb-6" data-testid="filter-bar">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select defaultValue="all">
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las transferencias</SelectItem>
                  <SelectItem value="pending">Solo pendientes</SelectItem>
                  <SelectItem value="approved">Solo aprobadas</SelectItem>
                  <SelectItem value="rejected">Solo rechazadas</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="week">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Último día</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Buscar por referencia..." 
                className="w-52"
                data-testid="search-input"
              />
            </div>
          </div>
        </Card>

        {/* Transfer Cards */}
        <div className="space-y-6" data-testid="transfers-list">
          {transfers?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">No hay transferencias</h3>
                <p className="text-muted-foreground">
                  No se encontraron transferencias para revisar en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            transfers?.map((transfer) => (
              <Card 
                key={transfer.id} 
                className={`border-l-4 ${
                  transfer.status === "pending" 
                    ? "border-l-yellow-500" 
                    : transfer.status === "approved"
                    ? "border-l-green-500 opacity-75"
                    : "border-l-red-500 opacity-75"
                }`}
                data-testid={`transfer-card-${transfer.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Transfer Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transfer.status === "pending" 
                            ? "bg-yellow-100" 
                            : transfer.status === "approved"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}>
                          {transfer.status === "pending" && <Clock className="w-5 h-5 text-yellow-600" />}
                          {transfer.status === "approved" && <Check className="w-5 h-5 text-green-600" />}
                          {transfer.status === "rejected" && <X className="w-5 h-5 text-red-600" />}
                        </div>
                        <div>
                          <h3>Transferencia #{transfer.referenceNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            {transfer.status === "pending" && "Pendiente de revisión"}
                            {transfer.status === "approved" && "Aprobada"}
                            {transfer.status === "rejected" && "Rechazada"}
                          </p>
                        </div>
                        <Badge 
                          className={`ml-auto px-3 py-1 rounded-full ${
                            transfer.status === "pending" 
                              ? "bg-amber-100 text-amber-700"
                              : transfer.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                          data-testid={`status-${transfer.status}`}
                        >
                          {transfer.status === "pending" && "Pendiente"}
                          {transfer.status === "approved" && "Aprobada"}
                          {transfer.status === "rejected" && "Rechazada"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente</p>
                          <p className="font-medium" data-testid="transfer-client">Usuario #{transfer.userId.slice(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Banco</p>
                          <p className="font-medium">{transfer.bank}</p>
                          <p className="text-sm text-muted-foreground">Ref: {transfer.referenceNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monto</p>
                          <p className="font-medium">{transfer.amount} VED</p>
                          <p className="text-sm text-muted-foreground">~${(parseFloat(transfer.amount) / 30).toFixed(2)} USD</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha/Hora</p>
                          <p className="font-medium">
                            {new Date(transfer.transferDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">{transfer.transferTime}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Concepto</p>
                        <p className="font-medium">{transfer.purpose}</p>
                        {transfer.comments && (
                          <p className="text-sm text-muted-foreground mt-1">{transfer.comments}</p>
                        )}
                        {transfer.adminComments && (
                          <p className="text-sm text-red-600 mt-1">
                            <strong>Comentario admin:</strong> {transfer.adminComments}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Receipt Preview */}
                    <div className="lg:w-80">
                      <p className="text-sm text-muted-foreground mb-2">Comprobante</p>
                      <div className="border border-border rounded-lg p-4 bg-muted/50">
                        <div className="aspect-[3/4] bg-white rounded border-2 border-dashed border-border flex items-center justify-center">
                          <div className="text-center">
                            {transfer.receiptUrl?.includes('.pdf') ? (
                              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            ) : (
                              <FileImage className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            )}
                            <p className="text-sm text-muted-foreground">
                              {transfer.receiptUrl ? 'Comprobante adjunto' : 'Sin comprobante'}
                            </p>
                            {transfer.receiptUrl && (
                              <button className="text-primary hover:underline text-sm mt-1">
                                Ver original
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {transfer.status === "pending" && (
                    <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                      <Button 
                        onClick={() => handleApprove(transfer.id)}
                        disabled={updateTransferMutation.isPending}
                        className="flex-1 lg:flex-none"
                        data-testid={`button-approve-${transfer.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleReject(transfer.id)}
                        disabled={updateTransferMutation.isPending}
                        className="flex-1 lg:flex-none"
                        data-testid={`button-reject-${transfer.id}`}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1 lg:flex-none"
                        data-testid={`button-comment-${transfer.id}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Comentar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {transfers && transfers.length > 0 && (
          <div className="flex items-center justify-between mt-8" data-testid="pagination">
            <p className="text-sm text-muted-foreground">
              Mostrando 1-{transfers.length} de {transfers.length} transferencias
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm">1</Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
