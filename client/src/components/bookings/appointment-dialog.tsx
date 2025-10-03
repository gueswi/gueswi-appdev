import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Service, StaffMember, Location } from "@shared/schema";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  services: Service[];
  staff: StaffMember[];
  locations: Location[];
  prefilledDate?: { start: Date; end: Date };
}

const formSchema = z.object({
  serviceId: z.string().min(1, "Servicio requerido"),
  staffId: z.string().min(1, "Personal requerido"),
  locationId: z.string().min(1, "Ubicación requerida"),
  customerName: z.string().min(1, "Nombre requerido"),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().min(1, "Teléfono requerido"),
  startTime: z.union([z.date(), z.string()]),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  services,
  staff,
  locations,
  prefilledDate,
}: AppointmentDialogProps) {
  const { toast } = useToast();
  const isEditing = !!appointment;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: appointment
      ? {
          serviceId: appointment.serviceId,
          staffId: appointment.staffId,
          locationId: appointment.locationId,
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail,
          customerPhone: appointment.customerPhone,
          startTime: new Date(appointment.startTime),
          status: appointment.status,
          notes: appointment.notes,
        }
      : {
          serviceId: "",
          staffId: "",
          locationId: locations[0]?.id || "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          startTime: prefilledDate?.start || new Date(),
          status: "pending",
          notes: "",
        },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Get selected service to calculate duration
      const service = services.find((s) => s.id === data.serviceId);
      if (!service) {
        throw new Error("Servicio no encontrado");
      }

      // Calculate endTime automatically
      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      const payload = {
        ...data,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      return await apiRequest("POST", "/api/appointments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Cita creada",
        description: "La cita se ha creado exitosamente",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Get selected service to calculate duration
      const service = services.find((s) => s.id === data.serviceId);
      if (!service) {
        throw new Error("Servicio no encontrado");
      }

      // Calculate endTime automatically
      const startTime = new Date(data.startTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      const payload = {
        ...data,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      return await apiRequest("PATCH", `/api/appointments/${appointment!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Cita actualizada",
        description: "La cita se ha actualizado exitosamente",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la cita",
        variant: "destructive",
      });
    },
  });

  // Reset form when appointment changes or dialog opens
  useEffect(() => {
    if (open) {
      if (appointment) {
        // Editing existing appointment
        form.reset({
          serviceId: appointment.serviceId,
          staffId: appointment.staffId,
          locationId: appointment.locationId,
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail,
          customerPhone: appointment.customerPhone,
          startTime: new Date(appointment.startTime),
          status: appointment.status,
          notes: appointment.notes,
        });
      } else {
        // Creating new appointment
        form.reset({
          serviceId: "",
          staffId: "",
          locationId: locations[0]?.id || "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          startTime: prefilledDate?.start || new Date(),
          status: "pending",
          notes: "",
        });
      }
    }
  }, [open, appointment, form, locations, prefilledDate]);

  const onSubmit = (data: FormData) => {
    const startTime = new Date(data.startTime);
    const now = new Date();
    
    // Only validate past dates for new appointments or when moving an existing appointment to the past
    if (!isEditing) {
      // Creating new appointment - block past dates
      if (startTime < now) {
        toast({
          title: "Error: fecha en el pasado",
          description: "No puedes crear citas en fechas pasadas",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Editing existing appointment - only block if moving to a different past date
      const originalStartTime = appointment ? new Date(appointment.startTime) : null;
      const isMovingToThePast = originalStartTime && 
                                startTime.getTime() !== originalStartTime.getTime() && 
                                startTime < now;
      
      if (isMovingToThePast) {
        toast({
          title: "Operación no permitida",
          description: "No puedes mover citas al pasado",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de la cita"
              : "Completa el formulario para crear una nueva cita"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Service */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-service">
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Staff */}
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-staff">
                        <SelectValue placeholder="Seleccionar personal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-location">
                        <SelectValue placeholder="Seleccionar ubicación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Cliente *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Juan Pérez"
                        data-testid="input-customer-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Phone */}
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+34 600 000 000"
                        data-testid="input-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Customer Email */}
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      type="email"
                      placeholder="juan@ejemplo.com"
                      data-testid="input-customer-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Time */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => {
                // Function to format date without timezone conversion
                const formatDateTimeLocal = (value: Date | string) => {
                  if (!value) return "";
                  const date = value instanceof Date ? value : new Date(value);
                  if (isNaN(date.getTime())) return "";
                  
                  // Get components in local timezone
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  
                  // Format for datetime-local input: "2025-10-14T14:00"
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                };

                return (
                  <FormItem>
                    <FormLabel>Fecha y Hora de Inicio *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(field.value)}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Duration Info */}
            {form.watch("serviceId") && (() => {
              const selectedService = services.find((s) => s.id === form.watch("serviceId"));
              return selectedService ? (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Duración:</strong> {selectedService.duration} minutos
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    La hora de finalización se calculará automáticamente
                  </p>
                </div>
              ) : null;
            })()}

            {/* Status */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "pending"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Notas adicionales sobre la cita..."
                      rows={3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar"
                  : "Crear Cita"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
