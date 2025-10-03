import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, DateSelectArg, EventContentArg } from "@fullcalendar/core";
import type { Appointment, StaffMember, Service, Location } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CalendarViewProps {
  appointments: Appointment[];
  staff: StaffMember[];
  services: Service[];
  locations: Location[];
  isLoading: boolean;
  selectedLocationId?: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateAppointment?: (dateInfo: DateSelectArg) => void;
}

export function CalendarView({
  appointments,
  staff,
  services,
  locations,
  isLoading,
  selectedLocationId,
  onAppointmentClick,
  onCreateAppointment,
}: CalendarViewProps) {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  const [filterStaffId, setFilterStaffId] = useState<string>("all");
  const [filterServiceId, setFilterServiceId] = useState<string>("all");

  // Obtener location seleccionada para validaciones
  const selectedLocation = selectedLocationId && selectedLocationId !== "all"
    ? locations.find(l => l.id === selectedLocationId)
    : null;

  // Convertir operatingHours a businessHours de FullCalendar
  const businessHours = selectedLocation?.operatingHours
    ? Object.entries(selectedLocation.operatingHours as Record<string, any>)
        .filter(([_, schedule]: any) => schedule?.enabled)
        .flatMap(([day, schedule]: any) =>
          schedule.blocks?.map((block: any) => ({
            daysOfWeek: [parseInt(day)],
            startTime: block.start,
            endTime: block.end,
          }))
        )
        .filter(Boolean)
    : [];

  // Función para verificar si una fecha está en horario de operación
  const isWithinBusinessHours = (date: Date, locationId: string) => {
    const location = locations?.find((l: any) => l.id === locationId);
    if (!location?.operatingHours) return false;

    const dayOfWeek = date.getDay();
    const operatingHours = location.operatingHours as Record<string, any>;
    const daySchedule = operatingHours[dayOfWeek];

    if (!daySchedule?.enabled) return false;

    const timeMinutes = date.getHours() * 60 + date.getMinutes();

    return daySchedule.blocks?.some((block: any) => {
      const [startH, startM] = block.start.split(":").map(Number);
      const [endH, endM] = block.end.split(":").map(Number);
      const blockStart = startH * 60 + startM;
      const blockEnd = endH * 60 + endM;
      return timeMinutes >= blockStart && timeMinutes < blockEnd;
    });
  };

  // Mutation to update appointment time with optimistic updates
  const updateAppointmentTime = useMutation({
    mutationFn: async ({
      id,
      startTime,
      endTime,
    }: {
      id: string;
      startTime: string;
      endTime: string;
    }) => {
      await apiRequest("PATCH", `/api/appointments/${id}`, {
        startTime,
        endTime,
      });
    },
    onMutate: async ({ id, startTime, endTime }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/appointments"] });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(["/api/appointments"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/appointments"], (old: any) =>
        old?.map((apt: any) =>
          apt.id === id
            ? { ...apt, startTime, endTime, updatedAt: new Date().toISOString() }
            : apt
        )
      );

      // Return context with the snapshot value
      return { previousAppointments };
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value
      if (context?.previousAppointments) {
        queryClient.setQueryData(["/api/appointments"], context.previousAppointments);
      }
      toast({
        title: "Error al actualizar",
        description: "No se pudo mover la cita",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita actualizada",
        description: "La cita se ha movido correctamente",
      });
    },
    onSettled: () => {
      // Refetch to ensure we're in sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (filterStaffId !== "all" && apt.staffId !== filterStaffId) return false;
    if (filterServiceId !== "all" && apt.serviceId !== filterServiceId) return false;
    if (selectedLocationId && selectedLocationId !== "all" && apt.locationId !== selectedLocationId) return false;
    return true;
  });

  // Convert appointments to FullCalendar events
  const events = filteredAppointments.map((apt) => {
    const service = services.find((s) => s.id === apt.serviceId);
    const staffMember = staff.find((s) => s.id === apt.staffId);
    
    return {
      id: apt.id,
      title: `${apt.customerName}${service ? ` - ${service.name}` : ""}`,
      start: apt.startTime,
      end: apt.endTime,
      backgroundColor: service?.color || staffMember?.color || "#6366f1",
      borderColor: service?.color || staffMember?.color || "#6366f1",
      extendedProps: {
        appointment: apt,
        staffName: staffMember?.name,
        serviceName: service?.name,
        status: apt.status,
      },
    };
  });

  // Handle event drop (drag and drop)
  const handleEventDrop = (info: EventDropArg) => {
    const newStart = info.event.start!;
    const newEnd = info.event.end!;
    const appointment = info.event.extendedProps.appointment;
    const locationId = appointment.locationId;
    const staffId = appointment.staffId;

    // Validar fecha pasada
    if (newStart < new Date()) {
      info.revert();
      toast({
        title: "Operación no permitida",
        description: "No puedes mover citas al pasado",
        variant: "destructive",
      });
      return;
    }

    // Obtener datos de ubicación y staff
    const location = locations?.find((l: any) => l.id === locationId);
    const staffMember = staff.find((s: any) => s.id === staffId);
    const dayOfWeek = newStart.getDay();
    const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dayOfWeek];

    // Validación defensiva: verificar que location y staff existan
    if (!location) {
      info.revert();
      toast({
        title: "Error",
        description: "No se encontró la ubicación de esta cita",
        variant: "destructive",
      });
      return;
    }

    if (!staffMember) {
      info.revert();
      toast({
        title: "Error",
        description: "No se encontró el personal asignado a esta cita",
        variant: "destructive",
      });
      return;
    }

    // Validar ubicación
    const locationDaySchedule = location?.operatingHours?.[dayOfWeek];
    if (!locationDaySchedule?.enabled) {
      info.revert();
      toast({
        title: "Ubicación cerrada",
        description: `${location.name} no opera los ${dayName}`,
        variant: "destructive",
      });
      return;
    }

    // Validar staff
    const staffSchedule = staffMember.schedulesByLocation?.[locationId]?.[dayOfWeek];
    if (!staffSchedule?.enabled) {
      // Obtener días que SÍ trabaja el staff
      const workingDays = [];
      const staffScheduleForLocation = staffMember?.schedulesByLocation?.[locationId] || {};
      
      Object.keys(staffScheduleForLocation).forEach((day) => {
        const daySchedule = staffScheduleForLocation[day];
        if (daySchedule?.enabled) {
          const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
          const blocks = daySchedule.blocks.map((b: any) => `${b.start}-${b.end}`).join(", ");
          workingDays.push(`${dayNames[day]} (${blocks})`);
        }
      });

      info.revert();
      toast({
        title: "Staff no disponible",
        description: `${staffMember?.name} no trabaja los ${dayName}. Solo trabaja: ${workingDays.join(" • ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validar horario específico del staff
    const startMinutes = newStart.getHours() * 60 + newStart.getMinutes();
    const endMinutes = newEnd.getHours() * 60 + newEnd.getMinutes();

    const isInStaffSchedule = staffSchedule.blocks?.some((block: any) => {
      const [startH, startM] = block.start.split(":").map(Number);
      const [endH, endM] = block.end.split(":").map(Number);
      const blockStart = startH * 60 + startM;
      const blockEnd = endH * 60 + endM;
      return startMinutes >= blockStart && endMinutes <= blockEnd;
    });

    if (!isInStaffSchedule) {
      const staffBlocks = staffSchedule.blocks.map((b: any) => `${b.start}-${b.end}`).join(", ");
      info.revert();
      toast({
        title: "Horario no disponible",
        description: `${staffMember?.name} solo trabaja: ${staffBlocks} los ${dayName}`,
        variant: "destructive",
      });
      return;
    }

    // Si pasa todas las validaciones, actualizar
    updateAppointmentTime.mutate(
      {
        id: info.event.id,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      },
      {
        onError: () => {
          info.revert();
        },
      }
    );
  };

  // Handle event click
  const handleEventClick = (info: EventClickArg) => {
    if (onAppointmentClick) {
      onAppointmentClick(info.event.extendedProps.appointment as Appointment);
    }
  };

  // Handle date select (for creating new appointments)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const clickedDate = selectInfo.start;
    
    // Validar fecha pasada
    if (clickedDate < new Date()) {
      toast({
        title: "Fecha no disponible",
        description: "No puedes crear citas en el pasado",
        variant: "destructive",
      });
      return;
    }

    // Validar horario de ubicación SI hay filtro activo
    if (selectedLocationId && selectedLocationId !== "all") {
      const location = locations?.find((l: any) => l.id === selectedLocationId);
      const dayOfWeek = clickedDate.getDay();
      const daySchedule = location?.operatingHours?.[dayOfWeek];

      if (!daySchedule?.enabled) {
        const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][dayOfWeek];
        toast({
          title: "Ubicación cerrada",
          description: `Esta ubicación no opera los ${dayName}`,
          variant: "destructive",
        });
        return;
      }

      // Validar que la hora clickeada esté en horario
      const clickMinutes = clickedDate.getHours() * 60 + clickedDate.getMinutes();
      const isInSchedule = daySchedule.blocks?.some((block: any) => {
        const [startH, startM] = block.start.split(":").map(Number);
        const [endH, endM] = block.end.split(":").map(Number);
        const blockStart = startH * 60 + startM;
        const blockEnd = endH * 60 + endM;
        return clickMinutes >= blockStart && clickMinutes < blockEnd;
      });

      if (!isInSchedule) {
        toast({
          title: "Horario no disponible",
          description: "Esta ubicación no opera en este horario",
          variant: "destructive",
        });
        return;
      }
    }

    // Si pasa todas las validaciones, abrir modal
    if (onCreateAppointment) {
      onCreateAppointment(selectInfo);
    }
  };

  // Custom event content renderer
  const renderEventContent = (eventContent: EventContentArg) => {
    const { event } = eventContent;
    const status = event.extendedProps.status as string;
    
    return (
      <div className="p-1 overflow-hidden">
        <div className="font-medium text-xs truncate">{event.title}</div>
        {event.extendedProps.staffName && (
          <div className="text-xs opacity-90 truncate">
            👤 {event.extendedProps.staffName}
          </div>
        )}
        {status && (
          <div className="mt-0.5">
            <Badge
              variant={
                status === "confirmed"
                  ? "default"
                  : status === "pending"
                  ? "secondary"
                  : status === "cancelled"
                  ? "destructive"
                  : "outline"
              }
              className="text-xs py-0 px-1 h-auto"
            >
              {status}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // Calendar navigation handlers
  const handlePrevClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.prev();
  };

  const handleNextClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.next();
  };

  const handleTodayClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  const handleViewChange = (view: string) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(view);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Calendar Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevClick}
                data-testid="calendar-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                data-testid="calendar-today"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextClick}
                data-testid="calendar-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Selector */}
            <Select defaultValue="timeGridWeek" onValueChange={handleViewChange}>
              <SelectTrigger className="w-[140px]" data-testid="calendar-view-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dayGridMonth">Mes</SelectItem>
                <SelectItem value="timeGridWeek">Semana</SelectItem>
                <SelectItem value="timeGridDay">Día</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Staff Filter */}
              <Select value={filterStaffId} onValueChange={setFilterStaffId}>
                <SelectTrigger className="w-[180px]" data-testid="filter-staff">
                  <SelectValue placeholder="Filtrar por personal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el personal</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Service Filter */}
              <Select value={filterServiceId} onValueChange={setFilterServiceId}>
                <SelectTrigger className="w-[180px]" data-testid="filter-service">
                  <SelectValue placeholder="Filtrar por servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
                <p className="text-muted-foreground">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            <div className="calendar-wrapper">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                height="auto"
                contentHeight={600}
                locale="es"
                firstDay={1}
                eventDrop={handleEventDrop}
                eventClick={handleEventClick}
                select={handleDateSelect}
                eventContent={renderEventContent}
                slotLabelFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                buttonText={{
                  today: "Hoy",
                  month: "Mes",
                  week: "Semana",
                  day: "Día",
                }}
                businessHours={businessHours}
                selectConstraint={businessHours.length > 0 ? "businessHours" : undefined}
                eventConstraint={businessHours.length > 0 ? "businessHours" : undefined}
                selectAllow={(selectInfo) => {
                  if (!selectedLocationId || selectedLocationId === "all") return true;
                  return isWithinBusinessHours(selectInfo.start, selectedLocationId);
                }}
                eventAllow={(dropInfo, draggedEvent) => {
                  const locationId = draggedEvent.extendedProps?.appointment?.locationId || selectedLocationId;
                  if (!locationId || locationId === "all") return true;
                  return isWithinBusinessHours(dropInfo.start, locationId);
                }}
                slotLaneClassNames={(arg) => {
                  if (!selectedLocation) return "";

                  const dayOfWeek = arg.date.getDay();
                  const operatingHours = selectedLocation.operatingHours as Record<string, any>;
                  const daySchedule = operatingHours?.[dayOfWeek];

                  if (!daySchedule?.enabled) {
                    return "bg-red-50 dark:bg-red-950 opacity-40 cursor-not-allowed";
                  }

                  const timeMinutes = arg.date.getHours() * 60 + arg.date.getMinutes();
                  const isWithinHours = daySchedule.blocks?.some((block: any) => {
                    const [startH, startM] = block.start.split(":").map(Number);
                    const [endH, endM] = block.end.split(":").map(Number);
                    const blockStart = startH * 60 + startM;
                    const blockEnd = endH * 60 + endM;
                    return timeMinutes >= blockStart && timeMinutes < blockEnd;
                  });

                  return isWithinHours ? "" : "bg-red-50 dark:bg-red-950 opacity-40";
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Leyenda:</span>
            <div className="flex items-center gap-2">
              <Badge variant="default">Confirmada</Badge>
              <Badge variant="secondary">Pendiente</Badge>
              <Badge variant="destructive">Cancelada</Badge>
              <Badge variant="outline">Completada</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
        <p>
          💡 <strong>Tip:</strong> Arrastra las citas para cambiar su horario, haz clic en ellas para ver detalles, 
          o selecciona un rango de tiempo para crear una nueva cita.
        </p>
      </div>
    </div>
  );
}
