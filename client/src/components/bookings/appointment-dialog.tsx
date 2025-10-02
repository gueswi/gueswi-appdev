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
  endTime: z.union([z.date(), z.string()]),
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
          ...appointment,
          startTime: new Date(appointment.startTime),
          endTime: new Date(appointment.endTime),
        }
      : {
          serviceId: "",
          staffId: "",
          locationId: locations[0]?.id || "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          startTime: prefilledDate?.start || new Date(),
          endTime: prefilledDate?.end || new Date(Date.now() + 60 * 60 * 1000),
          status: "pending",
          notes: "",
        },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
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
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
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
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la cita",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Auto-calculate end time when service changes
  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service && service.duration) {
      const startTime = form.getValues("startTime");
      const start = new Date(startTime);
      const end = new Date(start.getTime() + service.duration * 60 * 1000);
      form.setValue("endTime", end);
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleServiceChange(value);
                    }}
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

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => {
                  const dateValue = field.value instanceof Date ? field.value : new Date(field.value);
                  const isValidDate = !isNaN(dateValue.getTime());
                  return (
                    <FormItem>
                      <FormLabel>Fecha y Hora de Inicio *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={isValidDate ? dateValue.toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => {
                  const dateValue = field.value instanceof Date ? field.value : new Date(field.value);
                  const isValidDate = !isNaN(dateValue.getTime());
                  return (
                    <FormItem>
                      <FormLabel>Fecha y Hora de Fin *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={isValidDate ? dateValue.toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

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
