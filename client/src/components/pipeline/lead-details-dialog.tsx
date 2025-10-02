import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Check, X, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Lead, PipelineStage, LeadActivity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editLeadSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  company: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  value: z.string().optional(),
  currency: z.string().default("USD"),
  probability: z.number().min(0).max(100),
  stageId: z.string().min(1),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type EditLeadFormData = z.infer<typeof editLeadSchema>;

interface LeadDetailsDialogProps {
  lead: Lead;
  stages: PipelineStage[];
  onClose: () => void;
}

export function LeadDetailsDialog({ lead, stages, onClose }: LeadDetailsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");

  const { data: leadDetails, isLoading, refetch } = useQuery<Lead>({
    queryKey: [`/api/pipeline/leads/${lead.id}`],
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Fetch lead activities
  const { data: activities = [] } = useQuery<LeadActivity[]>({
    queryKey: [`/api/pipeline/leads/${lead.id}/activities`],
    enabled: !!lead.id,
  });

  // Use lead prop as fallback if leadDetails is not loaded yet
  const currentLead = leadDetails || lead;

  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
    values: {
      name: currentLead.name,
      company: currentLead.company || "",
      email: currentLead.email || "",
      phone: currentLead.phone || "",
      value: currentLead.value?.toString() || "",
      currency: currentLead.currency || "USD",
      probability: currentLead.probability || 50,
      stageId: currentLead.stageId,
      expectedCloseDate: currentLead.expectedCloseDate
        ? format(new Date(currentLead.expectedCloseDate), "yyyy-MM-dd")
        : "",
      notes: currentLead.notes || "",
      tags: currentLead.tags?.join(", ") || "",
    },
  });

  const updateLead = useMutation({
    mutationFn: async (data: EditLeadFormData) => {
      const parsedValue = data.value ? parseFloat(data.value) : null;
      
      // For UPDATE, send all fields (use null for empty values to allow clearing)
      // Guard required fields to prevent invalid submissions
      const payload: any = {
        name: data.name,
        stageId: data.stageId || lead.stageId, // Never allow empty stageId
        currency: data.currency || "USD",
        probability: typeof data.probability === 'number' ? data.probability : 50,
        company: data.company || null,
        email: data.email || null,
        phone: data.phone || null,
        value: parsedValue !== null && !isNaN(parsedValue) ? parsedValue : null,
        notes: data.notes || null,
        tags: data.tags 
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : null,
      };

      return apiRequest("PATCH", `/api/pipeline/leads/${lead.id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/pipeline/leads/${lead.id}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/pipeline/metrics"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/pipeline/leads/${lead.id}/activities`] });
      await refetch();
      toast({
        title: "Lead actualizado",
        description: "Los cambios se guardaron exitosamente",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el lead",
        variant: "destructive",
      });
    },
  });

  const markAsWon = useMutation({
    mutationFn: async () => {
      const wonStage = stages.find(
        (s) => s.isFixed && s.name.toLowerCase().includes("ganado")
      );
      if (!wonStage) {
        throw new Error("No se encontró la etapa 'Ganado'");
      }
      // Use /move endpoint to create activity automatically
      await apiRequest("PATCH", `/api/pipeline/leads/${lead.id}/move`, {
        stageId: wonStage.id,
      });
      // Then update closedAt separately
      return apiRequest("PATCH", `/api/pipeline/leads/${lead.id}`, {
        closedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads", lead.id, "activities"] });
      toast({
        title: "Lead ganado",
        description: "El lead se marcó como ganado",
      });
      onClose();
    },
  });

  const markAsLost = useMutation({
    mutationFn: async () => {
      const lostStage = stages.find(
        (s) => s.isFixed && s.name.toLowerCase().includes("perdido")
      );
      if (!lostStage) {
        throw new Error("No se encontró la etapa 'Perdido'");
      }
      // Use /move endpoint to create activity automatically
      await apiRequest("PATCH", `/api/pipeline/leads/${lead.id}/move`, {
        stageId: lostStage.id,
      });
      // Then update closedAt separately
      return apiRequest("PATCH", `/api/pipeline/leads/${lead.id}`, {
        closedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads", lead.id, "activities"] });
      toast({
        title: "Lead perdido",
        description: "El lead se marcó como perdido",
      });
      onClose();
    },
  });

  const onSubmit = (data: EditLeadFormData) => {
    updateLead.mutate(data);
  };

  const currentStage = stages.find((s) => s.id === currentLead.stageId);
  const isWonOrLost = currentStage?.isFixed;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{currentLead.name}</DialogTitle>
            <div className="flex gap-2">
              {!isWonOrLost && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsWon.mutate()}
                    disabled={markAsWon.isPending}
                    data-testid="button-mark-won"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Ganado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsLost.mutate()}
                    disabled={markAsLost.isPending}
                    data-testid="button-mark-lost"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Perdido
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" data-testid="tab-info">Info</TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">Actividades</TabsTrigger>
            <TabsTrigger value="edit" data-testid="tab-edit">Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Empresa</div>
                <div className="font-medium">{currentLead.company || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                <div className="font-medium">{currentLead.email || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Teléfono</div>
                <div className="font-medium">{currentLead.phone || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Valor</div>
                <div className="font-medium">
                  {currentLead.value ? `$${Number(currentLead.value).toLocaleString()} ${currentLead.currency}` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Probabilidad</div>
                <div className="font-medium">{currentLead.probability}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Etapa</div>
                <div className="font-medium">{currentStage?.name || "N/A"}</div>
              </div>
            </div>
            {currentLead.notes && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notas</div>
                <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {currentLead.notes}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="space-y-3">
            <div className="space-y-2">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    data-testid={`activity-${activity.id}`}
                  >
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm">{activity.description}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No hay actividades registradas
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-edit-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} data-testid="input-edit-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Valor Estimado</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            data-testid="input-edit-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="MXN">MXN</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidad: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          data-testid="slider-edit-probability"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etapa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-stage">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedCloseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Cierre Esperada</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-edit-close-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (separados por coma)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-tags" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-edit-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-cancel-edit"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLead.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateLead.isPending ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
