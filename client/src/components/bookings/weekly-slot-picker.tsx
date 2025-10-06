import { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isPast,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
}

interface DaySlots {
  date: Date;
  slots: TimeSlot[];
}

interface WeeklySlotPickerProps {
  selectedDate?: Date;
  serviceId: string;
  locationId: string;
  duration: number;
  onSelectSlot: (slot: { date: Date; time: string; staffId?: string }) => void;
  staffMembers?: Array<{ id: string; name: string; schedulesByLocation?: any }>;
  staffId?: string;
}

export function WeeklySlotPicker({
  selectedDate,
  serviceId,
  locationId,
  duration,
  onSelectSlot,
  staffMembers = [],
  staffId,
}: WeeklySlotPickerProps) {
  const lastSelectedDateRef = useRef<number | null>(null);

  const initialDate = useMemo(() => selectedDate || new Date(), []);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const base = initialDate;
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time: string;
  } | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(
    () => {
      if (selectedDate) {
        const dayOfWeek = selectedDate.getDay();
        return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      }
      return null;
    },
  );

  // Actualizar cuando cambia selectedDate (solo si realmente cambió)
  useEffect(() => {
    if (selectedDate) {
      const dateTime = selectedDate.getTime();

      // Solo actualizar si la fecha realmente cambió
      if (lastSelectedDateRef.current !== dateTime) {
        lastSelectedDateRef.current = dateTime;

        const dayOfWeek = selectedDate.getDay();
        setSelectedDayIndex(dayOfWeek === 0 ? 6 : dayOfWeek - 1);

        // Ajustar semana si es necesario
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(selectedDate);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);
      }
    }
  }, [selectedDate]);

  // Obtener staff completo para validar horarios
  const { data: allStaff } = useQuery<any[]>({
    queryKey: ["/api/calendar/staff"],
  });

  const selectedStaff = allStaff?.find((s: any) => s.id === staffId);
  const staffScheduleForLocation =
    selectedStaff?.schedulesByLocation?.[locationId];

  // Función para verificar si el personal trabaja un día específico
  const doesStaffWorkOnDay = (date: Date): boolean => {
    if (!staffScheduleForLocation) return false;

    const dayOfWeek = date.getDay();
    const daySchedule = staffScheduleForLocation[dayOfWeek];

    return daySchedule?.enabled || false;
  };

  // Generar días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i),
  );

  const handlePreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
    setSelectedDayIndex(null);
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
    setSelectedDayIndex(null);
  };

  const handleSlotClick = (day: Date, slot: TimeSlot) => {
    if (!slot.available) return;

    const selected = { date: day, time: slot.time };
    setSelectedSlot(selected);
    onSelectSlot({
      date: day,
      time: slot.time,
      staffId: slot.staffId,
    });
  };

  // Obtener slots reales desde el backend para el día seleccionado
  const selectedDay =
    selectedDayIndex !== null ? weekDays[selectedDayIndex] : null;
  console.log(
    "🔍 Selected day object:",
    selectedDay,
    "ISO:",
    selectedDay?.toISOString(),
    "Formatted:",
    selectedDay?.toISOString().split("T")[0],
  );
  const { data: slotsData } = useQuery<{ slots: any[] }>({
    queryKey: [
      "/api/calendar/available-slots",
      {
        serviceId,
        staffId,
        date: selectedDay?.toISOString().split("T")[0],
        locationId,
      },
    ],
    enabled:
      !!selectedDay &&
      !!staffId &&
      !!serviceId &&
      doesStaffWorkOnDay(selectedDay),
  });

  const availableSlots = slotsData?.slots || [];

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Validar si el staff tiene horarios configurados para esta ubicación
  const hasScheduleForLocation = !!staffScheduleForLocation;

  return (
    <div className="space-y-4" data-testid="weekly-slot-picker">
      {/* Mensaje de error si no hay horarios configurados */}
      {!hasScheduleForLocation && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ El personal seleccionado no tiene horarios configurados para esta
            ubicación. Por favor, configura los horarios en la sección de
            Personal.
          </p>
        </div>
      )}

      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousWeek}
          data-testid="button-previous-week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-medium" data-testid="text-week-range">
          {format(currentWeekStart, "d MMM", { locale: es })} -{" "}
          {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: es })}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          data-testid="button-next-week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Paso 1: Seleccionar día de la semana */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const past = isPast(day) && !isToday(day);
          const today = isToday(day);
          const selected = selectedDayIndex === index;
          const staffWorksThisDay = doesStaffWorkOnDay(day);

          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (!past && staffWorksThisDay) {
                  setSelectedDayIndex(index);
                  setSelectedSlot(null);
                }
              }}
              disabled={past || !staffWorksThisDay}
              data-testid={`day-selector-${index}`}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all relative",
                (past || !staffWorksThisDay) &&
                  "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-gray-800",
                !past &&
                  staffWorksThisDay &&
                  !selected &&
                  "border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 bg-white dark:bg-gray-900",
                !past &&
                  staffWorksThisDay &&
                  selected &&
                  "border-blue-600 bg-blue-50 dark:bg-blue-900/40 shadow-md",
                today &&
                  !selected &&
                  staffWorksThisDay &&
                  "border-blue-300 bg-blue-50/20 dark:bg-blue-900/10",
              )}
            >
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {dayNames[index]}
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  selected &&
                    staffWorksThisDay &&
                    "text-blue-600 dark:text-blue-400",
                  today &&
                    !selected &&
                    staffWorksThisDay &&
                    "text-blue-500 dark:text-blue-300",
                  !staffWorksThisDay && "text-gray-400 dark:text-gray-600",
                )}
              >
                {day.getDate()}
              </div>
              {today && (
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1 uppercase">
                  Hoy
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Paso 2: Mostrar slots disponibles para el día seleccionado */}
      {selectedDayIndex !== null && selectedDay && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Horarios disponibles para{" "}
            {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}:
          </div>

          <ScrollArea className="h-[200px]">
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No hay horarios disponibles para este día
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot: any, index: number) => {
                  const slotTime = new Date(slot.startTime).toLocaleTimeString(
                    "es-ES",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );
                  const isSelected =
                    selectedSlot &&
                    isSameDay(selectedSlot.date, selectedDay) &&
                    selectedSlot.time === slotTime;

                  return (
                    <button
                      key={index}
                      onClick={() =>
                        handleSlotClick(selectedDay, {
                          time: slotTime,
                          available: true,
                          staffId: staffId,
                        })
                      }
                      data-testid={`slot-${index}`}
                      className={cn(
                        "p-3 text-sm rounded-lg border-2 transition-all font-medium",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{slotTime}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Información del slot seleccionado */}
      {selectedSlot && (
        <Card className="p-3 bg-muted/50" data-testid="selected-slot-info">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">Slot seleccionado: </span>
              {format(selectedSlot.date, "d 'de' MMMM", { locale: es })} a las{" "}
              {selectedSlot.time}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSlot(null)}
              data-testid="button-clear-selection"
            >
              Limpiar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
