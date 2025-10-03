import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: any;
  defaultDate?: Date | null;
  preSelectedLocationId?: string | null;
}

export default function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  preSelectedLocationId,
}: AppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados del formulario en cascada
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // Estados de UI
  const [openServiceCombo, setOpenServiceCombo] = useState(false);
  const [openStaffCombo, setOpenStaffCombo] = useState(false);

  // Fetch data
  const { data: locations } = useQuery({
    queryKey: ["/api/calendar/locations"],
  });

  const { data: allServices } = useQuery({
    queryKey: ["/api/calendar/services"],
  });

  const { data: allStaff } = useQuery({
    queryKey: ["/api/calendar/staff"],
  });

  // STEP 1: Pre-seleccionar ubicación si viene del filtro
  useEffect(() => {
    if (open && preSelectedLocationId) {
      setSelectedLocationId(preSelectedLocationId);
    }
  }, [open, preSelectedLocationId]);

  // STEP 2: Resetear appointment cuando se abre el dialog
  useEffect(() => {
    if (open && !appointment) {
      // Nuevo appointment
      setSelectedLocationId(preSelectedLocationId || "");
      setSelectedServiceId("");
      setSelectedStaffId("");
    } else if (open && appointment) {
      // Editar appointment
      setSelectedLocationId(appointment.locationId || appointment.location?.id || "");
      setSelectedServiceId(appointment.serviceId || appointment.service?.id || "");
      setSelectedStaffId(appointment.staffId || appointment.staff?.id || "");
    }
  }, [open, appointment, preSelectedLocationId]);

  // FILTRO EN CASCADA #1: Servicios disponibles en la ubicación seleccionada
  const filteredServices = allServices?.filter((service: any) => {
    if (!selectedLocationId) return false;
    
    const serviceLocationIds = service.serviceLocations?.map((sl: any) => sl.locationId) || [];
    return serviceLocationIds.includes(selectedLocationId);
  });

  // FILTRO EN CASCADA #2: Personal disponible en ubicación Y que ofrece el servicio
  const filteredStaff = allStaff?.filter((staff: any) => {
    if (!selectedLocationId || !selectedServiceId) return false;

    // Verifica que trabaje en la ubicación
    const worksInLocation = staff.schedulesByLocation && 
      Object.keys(staff.schedulesByLocation).includes(selectedLocationId);
    
    // Verifica que ofrezca el servicio
    const offersService = staff.staffServices?.some((ss: any) => ss.serviceId === selectedServiceId);

    return worksInLocation && offersService;
  });

  // CASCADA: Resetear servicio si se cambia ubicación
  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedServiceId(""); // Reset
    setSelectedStaffId(""); // Reset
  };

  // CASCADA: Resetear staff si se cambia servicio
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedStaffId(""); // Reset
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Cita creada exitosamente" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return await apiRequest("PATCH", `/api/appointments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Cita actualizada" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);

    // Validaciones
    if (!selectedLocationId) {
      toast({
        title: "Error",
        description: "Debes seleccionar una ubicación",
        variant: "destructive",
      });
      return;
    }

    if (!selectedServiceId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un servicio",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId) {
      toast({
        title: "Error",
        description: "Debes seleccionar personal",
        variant: "destructive",
      });
      return;
    }

    // Obtener servicio para calcular endTime
    const service = allServices?.find((s: any) => s.id === selectedServiceId);
    if (!service) {
      toast({
        title: "Error",
        description: "Servicio no encontrado",
        variant: "destructive",
      });
      return;
    }

    const startTime = new Date(formData.get("startTime") as string);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    const appointmentData = {
      locationId: selectedLocationId,
      serviceId: selectedServiceId,
      staffId: selectedStaffId,
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      customerPhone: formData.get("customerPhone"),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: formData.get("notes"),
    };

    if (appointment) {
      updateMutation.mutate({ id: appointment.id, data: appointmentData });
    } else {
      createMutation.mutate(appointmentData);
    }
  };

  const formatDateTimeLocal = (isoDate: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const selectedService = allServices?.find((s: any) => s.id === selectedServiceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PASO 1: Ubicación (obligatorio primero) */}
          <div>
            <Label>Ubicación *</Label>
            <Select
              value={selectedLocationId}
              onValueChange={handleLocationChange}
            >
              <SelectTrigger data-testid="select-location">
                <SelectValue placeholder="Seleccionar ubicación" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location: any) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PASO 2: Servicio (habilitado solo si hay ubicación) */}
          <div>
            <Label>Servicio *</Label>
            <Popover open={openServiceCombo} onOpenChange={setOpenServiceCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  disabled={!selectedLocationId}
                  data-testid="select-service"
                >
                  {selectedServiceId
                    ? filteredServices?.find((s: any) => s.id === selectedServiceId)?.name
                    : "Seleccionar servicio"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar servicio..." />
                  <CommandEmpty>No se encontró el servicio</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredServices?.map((service: any) => (
                      <CommandItem
                        key={service.id}
                        value={service.name}
                        onSelect={() => {
                          handleServiceChange(service.id);
                          setOpenServiceCombo(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedServiceId === service.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {service.duration} min • ${service.price || "0"}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {!selectedLocationId && (
              <p className="text-xs text-red-500 mt-1">
                Primero selecciona una ubicación
              </p>
            )}
          </div>

          {/* PASO 3: Personal (habilitado solo si hay servicio) */}
          <div>
            <Label>Personal *</Label>
            <Popover open={openStaffCombo} onOpenChange={setOpenStaffCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  disabled={!selectedServiceId}
                  data-testid="select-staff"
                >
                  {selectedStaffId
                    ? filteredStaff?.find((s: any) => s.id === selectedStaffId)?.name
                    : "Seleccionar personal"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar personal..." />
                  <CommandEmpty>No hay personal disponible</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredStaff?.map((staff: any) => (
                      <CommandItem
                        key={staff.id}
                        value={staff.name}
                        onSelect={() => {
                          setSelectedStaffId(staff.id);
                          setOpenStaffCombo(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedStaffId === staff.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {staff.role || "Staff"}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {!selectedServiceId && (
              <p className="text-xs text-red-500 mt-1">
                Primero selecciona un servicio
              </p>
            )}
          </div>

          {/* Información del servicio */}
          {selectedService && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Duración:</strong> {selectedService.duration} minutos
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                La hora de finalización se calculará automáticamente
              </p>
            </div>
          )}

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre del Cliente *</Label>
              <Input
                name="customerName"
                defaultValue={appointment?.customerName || ""}
                placeholder="Juan Pérez"
                required
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input
                name="customerPhone"
                type="tel"
                defaultValue={appointment?.customerPhone || ""}
                placeholder="+58 424 1234567"
                required
                data-testid="input-customer-phone"
              />
            </div>
          </div>

          <div>
            <Label>Email (opcional)</Label>
            <Input
              name="customerEmail"
              type="email"
              defaultValue={appointment?.customerEmail || ""}
              placeholder="juan@ejemplo.com"
              data-testid="input-customer-email"
            />
          </div>

          {/* Fecha y hora */}
          <div>
            <Label>Fecha y Hora de Inicio *</Label>
            <Input
              type="datetime-local"
              name="startTime"
              defaultValue={
                appointment
                  ? formatDateTimeLocal(appointment.startTime)
                  : defaultDate
                  ? formatDateTimeLocal(defaultDate.toISOString())
                  : ""
              }
              required
              data-testid="input-start-time"
            />
          </div>

          {/* Notas */}
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              name="notes"
              defaultValue={appointment?.notes || ""}
              placeholder="Notas adicionales sobre la cita..."
              rows={3}
              data-testid="input-notes"
            />
          </div>

          <DialogFooter>
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
                : appointment
                ? "Actualizar"
                : "Crear Cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
