import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Upload, Info, Send, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBankTransferSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const transferSchema = insertBankTransferSchema.extend({
  transferDate: z.string(),
  transferTime: z.string(),
});

type TransferFormData = z.infer<typeof transferSchema>;

export default function TransferFormPage() {
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      bank: "",
      referenceNumber: "",
      amount: "0",
      transferDate: "",
      transferTime: "",
      purpose: "recarga",
      comments: "",
    },
  });

  const submitTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      const formData = new FormData();
      
      // Append form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Append file if selected
      if (selectedFile) {
        formData.append('receipt', selectedFile);
      }

      const res = await fetch("/api/bank-transfers", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transferencia enviada",
        description: "Tu transferencia ha sido enviada y será procesada en las próximas 24-48 horas.",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar transferencia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (data: TransferFormData) => {
    submitTransferMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" data-testid="transfer-form-page">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="mb-8">
              <h2>Transferencia Bancaria (Venezuela)</h2>
              <p className="text-muted-foreground">Completa el formulario con los datos de tu transferencia</p>
            </div>

            {/* Bank Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" data-testid="bank-selection">
              <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h4>Banco Venezuela</h4>
                  <p className="text-sm text-muted-foreground mb-3">0102-0XXX-XXXXXXXXXXXX</p>
                  <p className="text-xs text-muted-foreground">A nombre de: Gueswi Technologies C.A.</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h4>Banesco</h4>
                  <p className="text-sm text-muted-foreground mb-3">0134-0XXX-XXXXXXXXXXXX</p>
                  <p className="text-xs text-muted-foreground">A nombre de: Gueswi Technologies C.A.</p>
                </div>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="transfer-form">
              {/* Transfer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco origen</Label>
                  <Select onValueChange={(value) => form.setValue("bank", value)}>
                    <SelectTrigger data-testid="select-bank">
                      <SelectValue placeholder="Selecciona tu banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banco-venezuela">Banco Venezuela</SelectItem>
                      <SelectItem value="banesco">Banesco</SelectItem>
                      <SelectItem value="mercantil">Mercantil</SelectItem>
                      <SelectItem value="bbva">BBVA Provincial</SelectItem>
                      <SelectItem value="tesoro">Banco del Tesoro</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.bank && (
                    <p className="text-sm text-destructive">{form.formState.errors.bank.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Número de referencia</Label>
                  <Input 
                    id="reference"
                    placeholder="123456789"
                    {...form.register("referenceNumber")}
                    data-testid="input-reference"
                  />
                  {form.formState.errors.referenceNumber && (
                    <p className="text-sm text-destructive">{form.formState.errors.referenceNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha de transferencia</Label>
                  <Input 
                    id="date"
                    type="date"
                    {...form.register("transferDate")}
                    data-testid="input-date"
                  />
                  {form.formState.errors.transferDate && (
                    <p className="text-sm text-destructive">{form.formState.errors.transferDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input 
                    id="time"
                    type="time"
                    {...form.register("transferTime")}
                    data-testid="input-time"
                  />
                  {form.formState.errors.transferTime && (
                    <p className="text-sm text-destructive">{form.formState.errors.transferTime.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto transferido (VED)</Label>
                <Input 
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  {...form.register("amount")}
                  data-testid="input-amount"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">Comprobante de transferencia</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center" data-testid="file-upload">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedFile 
                      ? `Archivo seleccionado: ${selectedFile.name}`
                      : "Arrastra tu comprobante aquí o haz clic para seleccionar"
                    }
                  </p>
                  <input 
                    type="file" 
                    id="receipt" 
                    className="hidden" 
                    accept="image/*,.pdf" 
                    onChange={handleFileChange}
                    data-testid="input-receipt"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => document.getElementById('receipt')?.click()}
                    data-testid="button-select-file"
                  >
                    Seleccionar archivo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Formatos: JPG, PNG, PDF (máx. 5MB)</p>
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Concepto de pago</Label>
                <Select onValueChange={(value) => form.setValue("purpose", value)} defaultValue="recarga">
                  <SelectTrigger data-testid="select-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recarga">Recarga de saldo</SelectItem>
                    <SelectItem value="plan">Pago de plan mensual</SelectItem>
                    <SelectItem value="pack">Compra de pack adicional</SelectItem>
                    <SelectItem value="otro">Otro (especificar en comentarios)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.purpose && (
                  <p className="text-sm text-destructive">{form.formState.errors.purpose.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comentarios adicionales</Label>
                <Textarea 
                  id="comments"
                  rows={3}
                  placeholder="Información adicional sobre la transferencia..."
                  {...form.register("comments")}
                  data-testid="textarea-comments"
                />
                {form.formState.errors.comments && (
                  <p className="text-sm text-destructive">{form.formState.errors.comments.message}</p>
                )}
              </div>

              {/* Info Box */}
              <Alert data-testid="transfer-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-medium mb-1">Importante:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Las transferencias serán procesadas en horario laboral (9AM - 5PM)</li>
                      <li>• El tiempo de procesamiento es de 24-48 horas hábiles</li>
                      <li>• Recibirás una notificación una vez aprobada la transferencia</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setLocation('/dashboard')}
                  data-testid="button-cancel"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={submitTransferMutation.isPending}
                  data-testid="button-submit-transfer"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitTransferMutation.isPending ? 'Enviando...' : 'Enviar transferencia'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
