import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Briefcase, Plus, Settings } from "lucide-react";
import type { Location, Service, StaffMember, Appointment } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingsPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("calendar");

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch staff
  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Filter by location
  const filteredAppointments = selectedLocationId === "all" 
    ? appointments 
    : appointments.filter(apt => apt.locationId === selectedLocationId);

  const filteredStaff = selectedLocationId === "all"
    ? staff
    : staff.filter(s => s.locationId === selectedLocationId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reservas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona citas, servicios y disponibilidad
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button data-testid="button-new-appointment" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cita
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Cita</DialogTitle>
                  <DialogDescription>
                    Crea una nueva cita para un cliente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Formulario de cita en desarrollo...
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Location Filter - Affects Calendar and Staff views */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedLocationId}
            onValueChange={setSelectedLocationId}
            disabled={locationsLoading}
          >
            <SelectTrigger className="w-[280px]" data-testid="select-location">
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {locationsLoading && (
            <span className="text-xs text-muted-foreground">Cargando...</span>
          )}
          {selectedLocationId !== "all" && (
            <span className="text-xs text-muted-foreground">
              Filtrando citas y personal
            </span>
          )}
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b border-border bg-background px-6">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                data-testid="tab-calendar"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                data-testid="tab-services"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Servicios
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                data-testid="tab-staff"
              >
                <Users className="h-4 w-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger
                value="locations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                data-testid="tab-locations"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ubicaciones
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-0 p-6 h-full">
            <Card>
              <CardHeader>
                <CardTitle>Vista de Calendario</CardTitle>
                <CardDescription>
                  Visualiza y gestiona todas las citas programadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border border-border rounded-lg p-3 animate-pulse">
                        <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vista de calendario con drag & drop se mostrará en el siguiente paso
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {filteredAppointments.slice(0, 5).map((apt) => (
                        <div
                          key={apt.id}
                          className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          data-testid={`appointment-${apt.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{apt.customerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(apt.startTime).toLocaleString()}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              apt.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              apt.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredAppointments.length === 0 && (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">
                            No hay citas programadas
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedLocationId !== "all" 
                              ? "Prueba con otra ubicación o crea una nueva cita"
                              : "Crea una nueva cita para comenzar"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services View */}
          <TabsContent value="services" className="mt-0 p-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Servicios</CardTitle>
                  <CardDescription>
                    Gestiona los servicios disponibles para reserva
                  </CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-service">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-full mb-2"></div>
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="border border-border rounded-lg p-4"
                        data-testid={`service-${service.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{service.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-sm">
                                {service.duration} min
                              </span>
                              {service.price && (
                                <span className="text-sm font-medium">
                                  {service.currency} {service.price}
                                </span>
                              )}
                            </div>
                          </div>
                          {service.color && (
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: service.color }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          No hay servicios configurados
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Crea un servicio para que los clientes puedan reservar citas
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff View */}
          <TabsContent value="staff" className="mt-0 p-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personal</CardTitle>
                  <CardDescription>
                    Gestiona el personal y su disponibilidad
                  </CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-staff">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Personal
                </Button>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredStaff.map((member) => (
                      <div
                        key={member.id}
                        className="border border-border rounded-lg p-4"
                        data-testid={`staff-${member.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: member.color || '#6366f1' }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{member.name}</h3>
                            {member.role && (
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            )}
                            {member.email && (
                              <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                            )}
                            <div className="mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                member.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }`}>
                                {member.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredStaff.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          {selectedLocationId !== "all"
                            ? "No hay personal en esta ubicación"
                            : "No hay personal configurado"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLocationId !== "all"
                            ? "Prueba con otra ubicación o asigna personal a esta ubicación"
                            : "Agrega miembros del personal para gestionar citas"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations View */}
          <TabsContent value="locations" className="mt-0 p-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Ubicaciones</CardTitle>
                  <CardDescription>
                    Gestiona las ubicaciones donde se ofrecen servicios
                  </CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-location">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Ubicación
                </Button>
              </CardHeader>
              <CardContent>
                {locationsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-full mb-1"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {locations.map((location) => (
                      <div
                        key={location.id}
                        className="border border-border rounded-lg p-4"
                        data-testid={`location-${location.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {location.name}
                            </h3>
                            {location.address && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {location.address}
                                {location.city && `, ${location.city}`}
                                {location.state && `, ${location.state}`}
                              </p>
                            )}
                            {location.phone && (
                              <p className="text-sm text-muted-foreground mt-1">
                                📞 {location.phone}
                              </p>
                            )}
                            {location.email && (
                              <p className="text-sm text-muted-foreground">
                                ✉️ {location.email}
                              </p>
                            )}
                            <div className="mt-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                location.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }`}>
                                {location.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {locations.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          No hay ubicaciones configuradas
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Crea al menos una ubicación donde se ofrezcan los servicios
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
