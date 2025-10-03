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
import { Calendar, MapPin, Plus, Settings } from "lucide-react";
import type { Location, Service, StaffMember, Appointment } from "@shared/schema";
import { CalendarView } from "@/components/bookings/calendar-view";
import { AppointmentDialog } from "@/components/bookings/appointment-dialog";
import LocationsManager from "@/components/bookings/locations-manager";
import ServicesManager from "@/components/bookings/services-manager";
import StaffManager from "@/components/bookings/staff-manager";
import { SettingsDialog } from "@/components/bookings/settings-dialog";

export default function BookingsPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("calendar");
  
  // Dialog states
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/calendar/locations"],
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/calendar/services"],
  });

  // Fetch staff
  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/calendar/staff"],
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
            <Button
              data-testid="button-new-appointment"
              size="sm"
              onClick={() => {
                setSelectedAppointment(null);
                setAppointmentDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSettingsDialogOpen(true)}
              data-testid="button-settings"
            >
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
            <CalendarView
              appointments={filteredAppointments}
              staff={staff}
              services={services}
              locations={locations}
              isLoading={appointmentsLoading || staffLoading || servicesLoading}
              selectedLocationId={selectedLocationId}
              onAppointmentClick={(appointment) => {
                setSelectedAppointment(appointment);
                setAppointmentDialogOpen(true);
              }}
              onCreateAppointment={(dateInfo) => {
                setSelectedAppointment(null);
                setAppointmentDialogOpen(true);
              }}
            />
          </TabsContent>

          {/* Services View */}
          <TabsContent value="services" className="mt-0 p-6">
            <ServicesManager />
          </TabsContent>

          {/* Staff View */}
          <TabsContent value="staff" className="mt-0 p-6">
            <StaffManager />
          </TabsContent>

          {/* Locations View */}
          <TabsContent value="locations" className="mt-0 p-6">
            <LocationsManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        appointment={selectedAppointment}
        services={services}
        staff={staff}
        locations={locations}
      />

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
}
