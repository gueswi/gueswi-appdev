import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2, Loader2 } from "lucide-react";
import type { Service, StaffMember, Location } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const bookingFormSchema = z.object({
  serviceId: z.string().min(1, "Selecciona un servicio"),
  staffId: z.string().min(1, "Selecciona un miembro del personal"),
  locationId: z.string().min(1, "Selecciona una ubicación"),
  date: z.string().min(1, "Selecciona una fecha"),
  time: z.string().min(1, "Selecciona una hora"),
  customerName: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  customerEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  customerPhone: z.string().min(6, "Teléfono inválido"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function PublicBookingPage() {
  const [, params] = useRoute("/book/:tenantId");
  const tenantId = params?.tenantId;

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/public/services", tenantId],
    enabled: !!tenantId,
  });

  // Fetch staff
  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/public/staff", tenantId],
    enabled: !!tenantId,
  });

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/public/locations", tenantId],
    enabled: !!tenantId,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceId: "",
      staffId: "",
      locationId: "",
      date: "",
      time: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const service = services.find((s) => s.id === data.serviceId);
      
      // Construct date with explicit local timestamp to avoid timezone issues
      const selectedDateTime = new Date(`${data.date}T${data.time}:00`);

      const endDateTime = new Date(selectedDateTime);
      if (service?.duration) {
        endDateTime.setMinutes(endDateTime.getMinutes() + service.duration);
      } else {
        endDateTime.setMinutes(endDateTime.getMinutes() + 60);
      }

      return await apiRequest("POST", "/api/public/appointments", {
        tenantId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        locationId: data.locationId,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        startTime: selectedDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: "pending",
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      setBookingConfirmed(true);
    },
  });

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Generate available time slots for selected date
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots() : [];

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudo identificar la empresa</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (bookingConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">¡Reserva Confirmada!</CardTitle>
            <CardDescription className="text-base mt-2">
              Tu cita ha sido reservada exitosamente. Recibirás una confirmación por email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                setBookingConfirmed(false);
                form.reset();
                setSelectedServiceId("");
                setSelectedDate("");
              }}
              data-testid="button-new-booking"
            >
              Hacer otra reserva
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Reserva tu Cita
          </h1>
          <p className="text-muted-foreground">
            Selecciona el servicio y completa el formulario
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Services */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Servicios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay servicios disponibles
                  </p>
                ) : (
                  <div className="space-y-2">
                    {services.filter((s) => s.isActive).map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          form.setValue("serviceId", service.id);
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedServiceId === service.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`service-card-${service.id}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-foreground">
                            {service.name}
                          </h3>
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: service.color || "#6366f1" }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{service.duration} min</span>
                          {service.price && (
                            <span className="ml-auto font-medium">
                              {service.price} {service.currency || "EUR"}
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Completa tu Reserva</CardTitle>
                <CardDescription>
                  Proporciona tus datos y selecciona fecha y hora
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      createBookingMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    {/* Staff Selection */}
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
                              {staffLoading ? (
                                <SelectItem value="loading" disabled>
                                  Cargando...
                                </SelectItem>
                              ) : (
                                staff
                                  .filter((s) => s.isActive)
                                  .map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{member.name}</span>
                                        {member.role && (
                                          <span className="text-xs text-muted-foreground">
                                            - {member.role}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location Selection */}
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
                              {locationsLoading ? (
                                <SelectItem value="loading" disabled>
                                  Cargando...
                                </SelectItem>
                              ) : (
                                locations
                                  .filter((l) => l.isActive)
                                  .map((location) => (
                                    <SelectItem key={location.id} value={location.id}>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{location.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date Selection */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => {
                                field.onChange(e);
                                setSelectedDate(e.target.value);
                              }}
                              data-testid="input-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time Selection */}
                    {selectedDate && (
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-time">
                                  <SelectValue placeholder="Seleccionar hora" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-60">
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-4">Tus Datos</h3>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Completo *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Juan Pérez"
                                  data-testid="input-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

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
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (opcional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="juan@ejemplo.com"
                                  data-testid="input-email"
                                />
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
                              <FormLabel>Notas (opcional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Información adicional sobre tu cita..."
                                  rows={3}
                                  data-testid="input-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Empty State Warning */}
                    {(!servicesLoading && services.length === 0) ||
                     (!staffLoading && staff.length === 0) ||
                     (!locationsLoading && locations.length === 0) ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                          Lo sentimos, actualmente no hay disponibilidad para reservas.
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          {services.length === 0 && "No hay servicios disponibles. "}
                          {staff.length === 0 && "No hay personal disponible. "}
                          {locations.length === 0 && "No hay ubicaciones disponibles. "}
                          Por favor, intenta más tarde.
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={
                        createBookingMutation.isPending ||
                        services.length === 0 ||
                        staff.length === 0 ||
                        locations.length === 0
                      }
                      data-testid="button-submit-booking"
                    >
                      {createBookingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        "Confirmar Reserva"
                      )}
                    </Button>

                    {createBookingMutation.isError && (
                      <p className="text-sm text-destructive text-center">
                        Error al crear la reserva. Por favor, intenta de nuevo.
                      </p>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
