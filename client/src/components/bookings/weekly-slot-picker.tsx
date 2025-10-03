import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

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
  staffMembers?: Array<{ id: string; name: string }>;
}

export function WeeklySlotPicker({
  selectedDate = new Date(),
  serviceId,
  locationId,
  duration,
  onSelectSlot,
  staffMembers = [],
}: WeeklySlotPickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(selectedDate, { weekStartsOn: 1 })
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time: string;
  } | null>(null);

  // Generar días de la semana
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

  const handlePreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
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

  // TODO: Generar slots reales desde el backend
  // Por ahora, slots de ejemplo
  const generateMockSlots = (day: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const hours = [9, 10, 11, 12, 14, 15, 16, 17];

    hours.forEach((hour) => {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        available: Math.random() > 0.3, // 70% disponibles
        staffName: staffMembers[0]?.name || "Personal",
        staffId: staffMembers[0]?.id,
      });
    });

    return slots;
  };

  return (
    <div className="space-y-4" data-testid="weekly-slot-picker">
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

      {/* Grid de días y slots */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, dayIndex) => {
            const slots = generateMockSlots(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dayIndex}
                className="space-y-2"
                data-testid={`day-column-${dayIndex}`}
              >
                {/* Header del día */}
                <div
                  className={`text-center p-2 rounded-lg border ${
                    isToday
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="text-xs font-medium">
                    {format(day, "EEE", { locale: es })}
                  </div>
                  <div className="text-lg font-bold">
                    {format(day, "d")}
                  </div>
                </div>

                {/* Slots del día */}
                <div className="space-y-1">
                  {slots.map((slot, slotIndex) => {
                    const isSelected =
                      selectedSlot &&
                      isSameDay(selectedSlot.date, day) &&
                      selectedSlot.time === slot.time;

                    return (
                      <button
                        key={slotIndex}
                        onClick={() => handleSlotClick(day, slot)}
                        disabled={!slot.available}
                        data-testid={`slot-${dayIndex}-${slotIndex}`}
                        className={`
                          w-full p-2 text-xs rounded border transition-colors
                          ${
                            slot.available
                              ? isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border"
                              : "bg-muted/30 text-muted-foreground border-muted cursor-not-allowed"
                          }
                        `}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{slot.time}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

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
