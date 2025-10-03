import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TimeBlock {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  blocks: TimeBlock[];
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function StaffManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [schedulesByLocation, setSchedulesByLocation] = useState<Record<string, Record<number, DaySchedule>>>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: locations } = useQuery({
    queryKey: ["/api/calendar/locations"],
  });

  const { data: services } = useQuery({
    queryKey: ["/api/calendar/services"],
  });

  const { data: staff } = useQuery({
    queryKey: ["/api/calendar/staff"],
  });

  const filteredServices = (services || []).filter((service: any) => {
    const serviceLocationIds = service.serviceLocations?.map((sl: any) => sl.locationId) || [];
    return selectedLocations.some(locId => serviceLocationIds.includes(locId));
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingStaff
        ? `/api/calendar/staff/${editingStaff.id}`
        : "/api/calendar/staff";
      const method = editingStaff ? "PATCH" : "POST";

      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/staff"] });
      toast({ title: editingStaff ? "Personal actualizado" : "Personal creado" });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el personal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/staff/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/staff"] });
      toast({ title: "Personal eliminado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (staffMember?: any) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name,
        email: staffMember.email || "",
        phone: staffMember.phone || "",
        role: staffMember.role || "",
      });

      // CRÍTICO: Cargar ubicaciones del staff
      const staffLocationIds = staffMember.schedulesByLocation 
        ? Object.keys(staffMember.schedulesByLocation)
        : [];
      setSelectedLocations(staffLocationIds);

      // CRÍTICO: Cargar horarios por ubicación
      if (staffMember.schedulesByLocation) {
        setSchedulesByLocation(staffMember.schedulesByLocation);
      } else {
        setSchedulesByLocation({});
      }

      // CRÍTICO: Cargar servicios del staff
      const staffServiceIds = staffMember.staffServices?.map((ss: any) => ss.serviceId) || [];
      setSelectedServices(staffServiceIds);

    } else {
      // Crear nuevo staff
      setEditingStaff(null);
      setFormData({ name: "", email: "", phone: "", role: "" });
      setSelectedLocations([]);
      setSchedulesByLocation({});
      setSelectedServices([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStaff(null);
  };

  const handleLocationToggle = (locationId: string) => {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
      const newSchedules = { ...schedulesByLocation };
      delete newSchedules[locationId];
      setSchedulesByLocation(newSchedules);
    } else {
      setSelectedLocations([...selectedLocations, locationId]);
      const newSchedules = { ...schedulesByLocation };
      newSchedules[locationId] = {
        0: { enabled: false, blocks: [] },
        1: { enabled: false, blocks: [] },
        2: { enabled: false, blocks: [] },
        3: { enabled: false, blocks: [] },
        4: { enabled: false, blocks: [] },
        5: { enabled: false, blocks: [] },
        6: { enabled: false, blocks: [] },
      };
      setSchedulesByLocation(newSchedules);
    }
  };

  const toggleDay = (locationId: string, dayIndex: number) => {
    const location = (locations || []).find((l: any) => l.id === locationId);
    const locationDaySchedule = location?.operatingHours?.[dayIndex];

    if (!locationDaySchedule?.enabled) {
      toast({
        title: "Día no disponible",
        description: `Esta ubicación no opera los ${DAYS[dayIndex]}`,
        variant: "destructive",
      });
      return;
    }

    const newSchedules = { ...schedulesByLocation };
    if (newSchedules[locationId][dayIndex].enabled) {
      // Deshabilitar
      newSchedules[locationId][dayIndex] = { enabled: false, blocks: [] };
    } else {
      // Calcular el rango de la ubicación para inicializar con valores válidos
      const locationMinStart = Math.min(
        ...locationDaySchedule.blocks.map((b: any) => {
          const [h, m] = b.start.split(":").map(Number);
          return h * 60 + m;
        })
      );
      const locationMaxEnd = Math.max(
        ...locationDaySchedule.blocks.map((b: any) => {
          const [h, m] = b.end.split(":").map(Number);
          return h * 60 + m;
        })
      );
      
      const defaultStart = `${String(Math.floor(locationMinStart / 60)).padStart(2, "0")}:${String(locationMinStart % 60).padStart(2, "0")}`;
      const defaultEnd = `${String(Math.floor(locationMaxEnd / 60)).padStart(2, "0")}:${String(locationMaxEnd % 60).padStart(2, "0")}`;
      
      // Habilitar con horario dentro del rango de la ubicación
      newSchedules[locationId][dayIndex] = {
        enabled: true,
        blocks: [{ start: defaultStart, end: defaultEnd }], // Valores dentro del rango de ubicación
      };
    }
    setSchedulesByLocation(newSchedules);
  };

  const addBlock = (locationId: string, dayIndex: number) => {
    const location = (locations || []).find((l: any) => l.id === locationId);
    const locationDaySchedule = location?.operatingHours?.[dayIndex];

    const newSchedules = { ...schedulesByLocation };
    const currentBlocks = newSchedules[locationId][dayIndex].blocks;

    let newStart = locationDaySchedule.blocks[0].start;
    if (currentBlocks.length > 0) {
      const lastBlock = currentBlocks[currentBlocks.length - 1];
      const [hours, minutes] = lastBlock.end.split(":").map(Number);

      let newMinutes = minutes + 1;
      let newHours = hours;
      if (newMinutes >= 60) {
        newHours += 1;
        newMinutes = 0;
      }

      const locationMaxEnd = locationDaySchedule.blocks[locationDaySchedule.blocks.length - 1].end;
      const [maxH, maxM] = locationMaxEnd.split(":").map(Number);
      if (newHours > maxH || (newHours === maxH && newMinutes >= maxM)) {
        toast({
          title: "No se puede agregar más bloques",
          description: "Has alcanzado el límite del horario de la ubicación",
          variant: "destructive",
        });
        return;
      }

      newStart = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
    }

    const locationMaxEnd = locationDaySchedule.blocks[locationDaySchedule.blocks.length - 1].end;
    newSchedules[locationId][dayIndex].blocks.push({ start: newStart, end: locationMaxEnd });
    setSchedulesByLocation(newSchedules);
  };

  const removeBlock = (locationId: string, dayIndex: number, blockIndex: number) => {
    const newSchedules = { ...schedulesByLocation };
    newSchedules[locationId][dayIndex].blocks = newSchedules[locationId][dayIndex].blocks.filter((_, i) => i !== blockIndex);
    
    if (newSchedules[locationId][dayIndex].blocks.length === 0) {
      newSchedules[locationId][dayIndex].enabled = false;
    }
    
    setSchedulesByLocation(newSchedules);
  };

  const updateBlock = (locationId: string, dayIndex: number, blockIndex: number, field: "start" | "end", value: string) => {
    const location = locations?.find((l: any) => l.id === locationId);
    const locationDaySchedule = location?.operatingHours?.[dayIndex];

    if (!locationDaySchedule || !locationDaySchedule.enabled) {
      toast({
        title: "Día no disponible",
        description: "Esta ubicación no opera este día",
        variant: "destructive",
      });
      return;
    }

    // Convertir valor ingresado a minutos desde medianoche
    const [inputH, inputM] = value.split(":").map(Number);
    const inputMinutes = inputH * 60 + inputM;

    // Calcular rango TOTAL de la ubicación (todos los bloques combinados)
    let locationMinStart = Infinity;
    let locationMaxEnd = 0;

    locationDaySchedule.blocks.forEach((block: any) => {
      const [startH, startM] = block.start.split(":").map(Number);
      const [endH, endM] = block.end.split(":").map(Number);
      const blockStart = startH * 60 + startM;
      const blockEnd = endH * 60 + endM;
      
      if (blockStart < locationMinStart) locationMinStart = blockStart;
      if (blockEnd > locationMaxEnd) locationMaxEnd = blockEnd;
    });

    // VALIDACIÓN CRÍTICA: Verificar que esté dentro del rango global
    if (inputMinutes < locationMinStart || inputMinutes > locationMaxEnd) {
      const minTime = `${String(Math.floor(locationMinStart / 60)).padStart(2, "0")}:${String(locationMinStart % 60).padStart(2, "0")}`;
      const maxTime = `${String(Math.floor(locationMaxEnd / 60)).padStart(2, "0")}:${String(locationMaxEnd % 60).padStart(2, "0")}`;
      
      toast({
        title: "Horario fuera de rango",
        description: `Debe estar entre ${minTime} y ${maxTime}`,
        variant: "destructive",
      });
      return;
    }

    // Actualizar el valor
    const newSchedules = { ...schedulesByLocation };
    const block = newSchedules[locationId][dayIndex].blocks[blockIndex];
    const oldValue = block[field];
    block[field] = value;

    // Validar que start < end
    const [startH, startM] = block.start.split(":").map(Number);
    const [endH, endM] = block.end.split(":").map(Number);
    const blockStart = startH * 60 + startM;
    const blockEnd = endH * 60 + endM;

    if (blockStart >= blockEnd) {
      toast({
        title: "Horario inválido",
        description: "La hora de inicio debe ser menor que la de fin",
        variant: "destructive",
      });
      block[field] = oldValue; // Revertir
      return;
    }

    // Validar solapamiento con otros bloques del mismo día
    const blocks = newSchedules[locationId][dayIndex].blocks;
    for (let i = 0; i < blocks.length; i++) {
      if (i === blockIndex) continue;
      
      const [oStartH, oStartM] = blocks[i].start.split(":").map(Number);
      const [oEndH, oEndM] = blocks[i].end.split(":").map(Number);
      const otherStart = oStartH * 60 + oStartM;
      const otherEnd = oEndH * 60 + oEndM;
      
      // Detectar solapamiento
      if (blockStart < otherEnd && blockEnd > otherStart) {
        toast({
          title: "Bloques solapados",
          description: "Los bloques de horario no pueden solaparse entre sí",
          variant: "destructive",
        });
        block[field] = oldValue; // Revertir
        return;
      }
    }

    // Si pasa todas las validaciones, aplicar cambio
    setSchedulesByLocation(newSchedules);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }

    if (selectedLocations.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos una ubicación", variant: "destructive" });
      return;
    }

    if (selectedServices.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un servicio", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      ...formData,
      locationIds: selectedLocations,
      schedulesByLocation,
      serviceIds: selectedServices,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Personal</h2>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-staff">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Personal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(staff || []).map((member: any) => (
          <Card
            key={member.id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleOpenDialog(member)}
            data-testid={`card-staff-${member.id}`}
          >
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role || "Staff"}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {member.staffServices?.length || 0} servicios
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Editar Personal" : "Agregar Personal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="María García"
                  data-testid="input-staff-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Estilista, Doctor, etc."
                  data-testid="input-staff-role"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="maria@ejemplo.com"
                  data-testid="input-staff-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+58 424 1234567"
                  data-testid="input-staff-phone"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ubicaciones donde trabaja *</h3>
              <div className="grid grid-cols-2 gap-2">
                {(locations || []).map((location: any) => (
                  <div key={location.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                      data-testid={`checkbox-location-${location.id}`}
                    />
                    <label className="text-sm">{location.name}</label>
                  </div>
                ))}
              </div>
            </div>

            {selectedLocations.map(locationId => {
              const location = (locations || []).find((l: any) => l.id === locationId);
              return (
                <Card key={locationId} className="p-4 bg-blue-50 dark:bg-blue-950">
                  <h4 className="font-semibold mb-1">Horario en: {location?.name}</h4>
                  
                  {/* Mostrar horario de la ubicación como referencia */}
                  <p className="text-xs text-muted-foreground mb-2">
                    📍 Horario de la ubicación: {" "}
                    {Object.entries(location?.operatingHours || {})
                      .filter(([_, schedule]: any) => schedule?.enabled)
                      .map(([day, schedule]: any) => {
                        const dayName = DAYS[parseInt(day)].substring(0, 3);
                        const blocks = schedule.blocks
                          .map((b: any) => `${b.start}-${b.end}`)
                          .join(", ");
                        return `${dayName}: ${blocks}`;
                      })
                      .join(" • ")}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                    💡 Puedes definir cualquier horario dentro del rango de la ubicación
                  </p>
                  
                  <div className="space-y-3">
                    {DAYS.map((dayName, dayIndex) => {
                      const locationDaySchedule = location?.operatingHours?.[dayIndex];
                      const isLocationDayActive = locationDaySchedule?.enabled;

                      return (
                        <Card
                          key={dayIndex}
                          className={`p-3 ${
                            !isLocationDayActive
                              ? "bg-gray-100 dark:bg-gray-900 opacity-50"
                              : schedulesByLocation[locationId]?.[dayIndex]?.enabled
                              ? "border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700"
                              : "border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={schedulesByLocation[locationId]?.[dayIndex]?.enabled || false}
                                onCheckedChange={() => toggleDay(locationId, dayIndex)}
                                disabled={!isLocationDayActive}
                                data-testid={`switch-day-${locationId}-${dayIndex}`}
                              />
                              <span className="font-medium text-sm">{dayName}</span>
                              {!isLocationDayActive && (
                                <span className="text-xs text-red-500">(Cerrado en ubicación)</span>
                              )}
                            </div>

                            {schedulesByLocation[locationId]?.[dayIndex]?.enabled && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addBlock(locationId, dayIndex)}
                                data-testid={`button-add-block-${locationId}-${dayIndex}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Turno
                              </Button>
                            )}
                          </div>

                          {schedulesByLocation[locationId]?.[dayIndex]?.enabled && (
                            <div className="space-y-2 ml-8">
                              {schedulesByLocation[locationId][dayIndex].blocks.map((block, blockIndex) => (
                                <div key={blockIndex} className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={block.start}
                                    onChange={(e) =>
                                      updateBlock(locationId, dayIndex, blockIndex, "start", e.target.value)
                                    }
                                    className="w-28 text-sm"
                                    data-testid={`input-block-start-${locationId}-${dayIndex}-${blockIndex}`}
                                  />
                                  <span className="text-xs text-muted-foreground">a</span>
                                  <Input
                                    type="time"
                                    value={block.end}
                                    onChange={(e) =>
                                      updateBlock(locationId, dayIndex, blockIndex, "end", e.target.value)
                                    }
                                    className="w-28 text-sm"
                                    data-testid={`input-block-end-${locationId}-${dayIndex}-${blockIndex}`}
                                  />

                                  {schedulesByLocation[locationId][dayIndex].blocks.length > 1 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeBlock(locationId, dayIndex, blockIndex)}
                                      data-testid={`button-remove-block-${locationId}-${dayIndex}-${blockIndex}`}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              );
            })}

            <div>
              <h3 className="font-semibold mb-3">Servicios que ofrece *</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Solo se muestran servicios disponibles en las ubicaciones seleccionadas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {filteredServices.map((service: any) => (
                  <div key={service.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedServices([...selectedServices, service.id]);
                        } else {
                          setSelectedServices(selectedServices.filter(id => id !== service.id));
                        }
                      }}
                      data-testid={`checkbox-service-${service.id}`}
                    />
                    <label className="text-sm">{service.name} ({service.duration}min)</label>
                  </div>
                ))}
              </div>
              {filteredServices.length === 0 && (
                <p className="text-sm text-red-500">
                  No hay servicios disponibles para las ubicaciones seleccionadas
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingStaff && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("¿Eliminar este personal? Esta acción no se puede deshacer.")) {
                      deleteMutation.mutate(editingStaff.id);
                    }
                  }}
                  data-testid="button-delete-staff"
                >
                  Eliminar Personal
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-staff">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-staff">
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
