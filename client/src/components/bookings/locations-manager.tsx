import { useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const TIMEZONES = [
  { value: "Europe/Madrid", label: "España (Madrid, Barcelona)" },
  { value: "Atlantic/Canary", label: "España (Canarias)" },
  { value: "America/New_York", label: "USA (Nueva York, Miami)" },
  { value: "America/Los_Angeles", label: "USA (Los Ángeles)" },
  { value: "America/Chicago", label: "USA (Chicago)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Mexico_City", label: "México" },
  { value: "America/Bogota", label: "Colombia" },
  { value: "America/Lima", label: "Perú" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { value: "Europe/London", label: "Reino Unido" },
  { value: "Europe/Paris", label: "Francia" },
  { value: "Asia/Tokyo", label: "Japón" },
];

export default function LocationsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    timezone: "Europe/Madrid",
  });

  const [operatingHours, setOperatingHours] = useState<Record<number, DaySchedule>>({
    0: { enabled: false, blocks: [] },
    1: { enabled: false, blocks: [] },
    2: { enabled: false, blocks: [] },
    3: { enabled: false, blocks: [] },
    4: { enabled: false, blocks: [] },
    5: { enabled: false, blocks: [] },
    6: { enabled: false, blocks: [] },
  });

  const { data: locations } = useQuery({
    queryKey: ["/api/calendar/locations"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLocation
        ? `/api/calendar/locations/${editingLocation.id}`
        : "/api/calendar/locations";
      const method = editingLocation ? "PATCH" : "POST";

      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/locations"] });
      toast({ title: editingLocation ? "Ubicación actualizada" : "Ubicación creada" });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la ubicación",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/locations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/locations"] });
      toast({ title: "Ubicación eliminada" });
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

  const handleOpenDialog = (location?: any) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address || "",
        city: location.city || "",
        phone: location.phone || "",
        email: location.email || "",
        timezone: location.timezone || "Europe/Madrid",
      });
      setOperatingHours(location.operatingHours || getDefaultHours());
    } else {
      setEditingLocation(null);
      setFormData({ name: "", address: "", city: "", phone: "", email: "", timezone: "Europe/Madrid" });
      setOperatingHours(getDefaultHours());
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
  };

  const getDefaultHours = () => ({
    0: { enabled: false, blocks: [] },
    1: { enabled: false, blocks: [] },
    2: { enabled: false, blocks: [] },
    3: { enabled: false, blocks: [] },
    4: { enabled: false, blocks: [] },
    5: { enabled: false, blocks: [] },
    6: { enabled: false, blocks: [] },
  });

  const toggleDay = (dayIndex: number) => {
    const newHours = { ...operatingHours };
    if (newHours[dayIndex].enabled) {
      newHours[dayIndex] = { enabled: false, blocks: [] };
    } else {
      newHours[dayIndex] = {
        enabled: true,
        blocks: [{ start: "09:00", end: "17:00" }],
      };
    }
    setOperatingHours(newHours);
  };

  const addBlock = (dayIndex: number) => {
    const newHours = { ...operatingHours };
    const currentBlocks = newHours[dayIndex].blocks;

    let newStart = "09:00";
    if (currentBlocks.length > 0) {
      const lastBlock = currentBlocks[currentBlocks.length - 1];
      const [hours, minutes] = lastBlock.end.split(":").map(Number);

      let newMinutes = minutes + 1;
      let newHours = hours;
      if (newMinutes >= 60) {
        newHours += 1;
        newMinutes = 0;
      }

      if (newHours >= 24) {
        toast({
          title: "No se puede agregar más bloques",
          description: "Ya no hay horario disponible en el día",
          variant: "destructive",
        });
        return;
      }

      newStart = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
    }

    newHours[dayIndex].blocks.push({ start: newStart, end: "18:00" });
    setOperatingHours(newHours);
  };

  const removeBlock = (dayIndex: number, blockIndex: number) => {
    const newHours = { ...operatingHours };
    newHours[dayIndex].blocks = newHours[dayIndex].blocks.filter((_, i) => i !== blockIndex);
    
    if (newHours[dayIndex].blocks.length === 0) {
      newHours[dayIndex].enabled = false;
    }
    
    setOperatingHours(newHours);
  };

  const updateBlock = (dayIndex: number, blockIndex: number, field: "start" | "end", value: string) => {
    const newHours = { ...operatingHours };
    const block = newHours[dayIndex].blocks[blockIndex];
    block[field] = value;

    if (block.start >= block.end) {
      toast({
        title: "Horario inválido",
        description: "La hora de inicio debe ser menor que la hora de fin",
        variant: "destructive",
      });
      return;
    }

    if (blockIndex > 0) {
      const prevBlock = newHours[dayIndex].blocks[blockIndex - 1];
      if (block.start <= prevBlock.end) {
        toast({
          title: "Horario inválido",
          description: "Los bloques no pueden solaparse",
          variant: "destructive",
        });
        return;
      }
    }

    if (blockIndex < newHours[dayIndex].blocks.length - 1) {
      const nextBlock = newHours[dayIndex].blocks[blockIndex + 1];
      if (block.end >= nextBlock.start) {
        toast({
          title: "Horario inválido",
          description: "Los bloques no pueden solaparse",
          variant: "destructive",
        });
        return;
      }
    }

    setOperatingHours(newHours);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }

    const hasActiveDay = Object.values(operatingHours).some(day => day.enabled);
    if (!hasActiveDay) {
      toast({
        title: "Error",
        description: "Debes activar al menos un día de operación",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      ...formData,
      operatingHours,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ubicaciones</h2>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-location">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ubicación
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(locations || []).map((location: any) => (
          <Card
            key={location.id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleOpenDialog(location)}
            data-testid={`card-location-${location.id}`}
          >
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm text-muted-foreground">{location.address}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {Object.values(location.operatingHours || {}).filter((d: any) => d?.enabled).length} días activos
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Editar Ubicación" : "Nueva Ubicación"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Centro Principal"
                  data-testid="input-location-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Caracas"
                  data-testid="input-location-city"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Dirección</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. Principal, Edificio..."
                  data-testid="input-location-address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+58 424 1234567"
                  data-testid="input-location-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@ubicacion.com"
                  data-testid="input-location-email"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Zona Horaria *</label>
                <Select
                  value={formData.timezone || "Europe/Madrid"}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.timezone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Hora actual: {new Date().toLocaleString("es", {
                      timeZone: formData.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short"
                    })}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Horario de Operación</h3>
              <div className="space-y-3">
                {DAYS.map((dayName, dayIndex) => (
                  <Card
                    key={dayIndex}
                    className={`p-4 ${
                      operatingHours[dayIndex].enabled
                        ? "border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={operatingHours[dayIndex].enabled}
                          onCheckedChange={() => toggleDay(dayIndex)}
                          data-testid={`switch-day-${dayIndex}`}
                        />
                        <span className="font-medium">{dayName}</span>
                      </div>

                      {operatingHours[dayIndex].enabled && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addBlock(dayIndex)}
                          data-testid={`button-add-block-${dayIndex}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar turno
                        </Button>
                      )}
                    </div>

                    {operatingHours[dayIndex].enabled && (
                      <div className="space-y-2 ml-8">
                        {operatingHours[dayIndex].blocks.map((block, blockIndex) => (
                          <div key={blockIndex} className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={block.start}
                              onChange={(e) =>
                                updateBlock(dayIndex, blockIndex, "start", e.target.value)
                              }
                              className="w-32"
                              data-testid={`input-block-start-${dayIndex}-${blockIndex}`}
                            />
                            <span className="text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={block.end}
                              onChange={(e) =>
                                updateBlock(dayIndex, blockIndex, "end", e.target.value)
                              }
                              className="w-32"
                              data-testid={`input-block-end-${dayIndex}-${blockIndex}`}
                            />

                            {operatingHours[dayIndex].blocks.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeBlock(dayIndex, blockIndex)}
                                data-testid={`button-remove-block-${dayIndex}-${blockIndex}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingLocation && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setLocationToDelete(editingLocation.id);
                    setDeleteDialogOpen(true);
                  }}
                  data-testid="button-delete-location"
                >
                  Eliminar Ubicación
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-location">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-location">
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La ubicación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocationToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (locationToDelete) {
                  deleteMutation.mutate(locationToDelete);
                }
                setDeleteDialogOpen(false);
                setLocationToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
