import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import { WeeklySlotPicker } from "./weekly-slot-picker";

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

  // Estado del flujo de 2 pasos
  const [step, setStep] = useState(1);

  // Estados del formulario en cascada (Paso 1)
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time: string;
    staffId?: string;
  } | null>(null);

  // Estados de datos del cliente (Paso 2)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

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

  // Reset al abrir/cerrar dialog
  useEffect(() => {
    if (open) {
      if (!appointment) {
        // Nuevo appointment
        setStep(1);
        setSelectedLocationId(preSelectedLocationId || "");
        setSelectedServiceId("");
        setSelectedStaffId("");
        setSelectedSlot(null);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setNotes("");
      } else {
        // Editar appointment - saltar al paso 2
        setStep(2);
        setSelectedLocationId(appointment.locationId || "");
        setSelectedServiceId(appointment.serviceId || "");
        setSelectedStaffId(appointment.staffId || "");
        setCustomerName(appointment.customerName || "");
        setCustomerPhone(appointment.customerPhone || "");
        setCustomerEmail(appointment.customerEmail || "");
        setNotes(appointment.notes || "");
        
        // Crear slot desde appointment existente
        const startTime = new Date(appointment.startTime);
        setSelectedSlot({
          date: startTime,
          time: `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
          staffId: appointment.staffId,
        });
      }
    }
  }, [open, appointment, preSelectedLocationId]);

  // FILTRO EN CASCADA #1: Servicios disponibles en la ubicación seleccionada
  const filteredServices = (allServices as any[])?.filter((service: any) => {
    if (!selectedLocationId) return false;
    const serviceLocationIds = service.serviceLocations?.map((sl: any) => sl.locationId) || [];
    return serviceLocationIds.includes(selectedLocationId);
  }) || [];

  // FILTRO EN CASCADA #2: Personal disponible en ubicación Y que ofrece el servicio
  const filteredStaff = (allStaff as any[])?.filter((staff: any) => {
    if (!selectedLocationId || !selectedServiceId) return false;

    const worksInLocation = staff.schedulesByLocation && 
      Object.keys(staff.schedulesByLocation).includes(selectedLocationId);
    
    const offersService = staff.staffServices?.some((ss: any) => ss.serviceId === selectedServiceId);

    return worksInLocation && offersService;
  }) || [];

  // CASCADA: Resetear servicio si se cambia ubicación
  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedServiceId("");
    setSelectedStaffId("");
    setSelectedSlot(null);
  };

  // CASCADA: Resetear staff si se cambia servicio
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedStaffId("");
    setSelectedSlot(null);
  };

  // Handler para selección de slot desde WeeklySlotPicker
  const handleSlotSelect = (slot: { date: Date; time: string; staffId?: string }) => {
    setSelectedSlot(slot);
    
    // Si el slot viene con staffId, auto-seleccionar ese staff
    if (slot.staffId && !selectedStaffId) {
      setSelectedStaffId(slot.staffId);
    }
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

  // Validar y pasar al siguiente paso
  const handleNextStep = () => {
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

    if (!selectedSlot) {
      toast({
        title: "Error",
        description: "Debes seleccionar un horario",
        variant: "destructive",
      });
      return;
    }

    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerPhone) {
      toast({
        title: "Error",
        description: "Nombre y teléfono son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSlot) {
      toast({
        title: "Error",
        description: "Debes seleccionar un horario",
        variant: "destructive",
      });
      return;
    }

    // Obtener servicio para calcular endTime
    const service = (allServices as any[])?.find((s: any) => s.id === selectedServiceId);
    if (!service) {
      toast({
        title: "Error",
        description: "Servicio no encontrado",
        variant: "destructive",
      });
      return;
    }

    // Construir fecha y hora desde el slot seleccionado
    const [hours, minutes] = selectedSlot.time.split(":").map(Number);
    const startTime = new Date(selectedSlot.date);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    const appointmentData = {
      locationId: selectedLocationId,
      serviceId: selectedServiceId,
      staffId: selectedStaffId,
      customerName,
      customerEmail,
      customerPhone,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes,
    };

    if (appointment) {
      updateMutation.mutate({ id: appointment.id, data: appointmentData });
    } else {
      createMutation.mutate(appointmentData);
    }
  };

  const selectedService = (allServices as any[])?.find((s: any) => s.id === selectedServiceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Cita" : "Nueva Cita"} - Paso {step} de 2
          </DialogTitle>
        </DialogHeader>

        {/* PASO 1: Selección de servicio, staff y horario */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Ubicación */}
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
                  {(locations as any[])?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Servicio */}
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
                      ? (filteredServices as any[])?.find((s: any) => s.id === selectedServiceId)?.name
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

            {/* Personal */}
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
                      ? (filteredStaff as any[])?.find((s: any) => s.id === selectedStaffId)?.name
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
              </div>
            )}

            {/* WeeklySlotPicker - solo mostrar si hay servicio y staff */}
            {selectedServiceId && selectedStaffId && selectedService && (
              <div>
                <Label>Selecciona un horario *</Label>
                <div className="mt-2 border rounded-lg p-4">
                  <WeeklySlotPicker
                    selectedDate={defaultDate || new Date()}
                    serviceId={selectedServiceId}
                    locationId={selectedLocationId}
                    duration={selectedService.duration}
                    onSelectSlot={handleSlotSelect}
                    staffMembers={filteredStaff}
                    staffId={selectedStaffId}
                  />
                </div>
              </div>
            )}

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
                type="button"
                onClick={handleNextStep}
                disabled={!selectedSlot}
                data-testid="button-next-step"
              >
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* PASO 2: Datos del cliente */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resumen de la selección */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-sm">Resumen de la cita</h3>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Ubicación:</strong>{" "}
                  {(locations as any[])?.find((l: any) => l.id === selectedLocationId)?.name}
                </p>
                <p>
                  <strong>Servicio:</strong> {selectedService?.name}
                </p>
                <p>
                  <strong>Personal:</strong>{" "}
                  {filteredStaff?.find((s: any) => s.id === selectedStaffId)?.name}
                </p>
                {selectedSlot && (
                  <p>
                    <strong>Horario:</strong>{" "}
                    {selectedSlot.date.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    a las {selectedSlot.time}
                  </p>
                )}
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre del Cliente *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+58 424 1234567"
                  required
                  data-testid="input-customer-phone"
                />
              </div>
            </div>

            <div>
              <Label>Email (opcional)</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                data-testid="input-customer-email"
              />
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales sobre la cita..."
                rows={3}
                data-testid="input-notes"
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)}
                data-testid="button-back"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atrás
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
        )}
      </DialogContent>
    </Dialog>
  );
}
