import { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ServicesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 60,
    price: "",
    currency: "USD",
  });

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const { data: locations } = useQuery({
    queryKey: ["/api/calendar/locations"],
  });

  const { data: services } = useQuery({
    queryKey: ["/api/calendar/services"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingService
        ? `/api/calendar/services/${editingService.id}`
        : "/api/calendar/services";
      const method = editingService ? "PATCH" : "POST";

      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/services"] });
      toast({ title: editingService ? "Servicio actualizado" : "Servicio creado" });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (service?: any) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || "",
        duration: service.duration,
        price: service.price || "",
        currency: service.currency || "USD",
      });
      const serviceLocationIds = service.serviceLocations?.map((sl: any) => sl.locationId) || [];
      setSelectedLocationIds(serviceLocationIds);
    } else {
      setEditingService(null);
      setFormData({ name: "", description: "", duration: 60, price: "", currency: "USD" });
      setSelectedLocationIds([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingService(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }

    if (selectedLocationIds.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos una ubicación",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      ...formData,
      locationIds: selectedLocationIds,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Servicios</h2>
        <Button onClick={() => handleOpenDialog()} data-testid="button-new-service">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(services || []).map((service: any) => (
          <Card
            key={service.id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleOpenDialog(service)}
            data-testid={`card-service-${service.id}`}
          >
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold">{service.name}</h3>
                <p className="text-sm text-muted-foreground">{service.duration} minutos</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {service.serviceLocations?.length || 0} ubicaciones
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Editar Servicio" : "Nuevo Servicio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masaje relajante"
                  data-testid="input-service-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el servicio..."
                  data-testid="input-service-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Duración (minutos) *</label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    min="1"
                    data-testid="input-service-duration"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Precio</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="50.00"
                    step="0.01"
                    data-testid="input-service-price"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Disponible en ubicaciones *
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecciona en qué ubicaciones estará disponible este servicio
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(locations || []).map((location: any) => (
                  <div key={location.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLocationIds([...selectedLocationIds, location.id]);
                        } else {
                          setSelectedLocationIds(selectedLocationIds.filter(id => id !== location.id));
                        }
                      }}
                      data-testid={`checkbox-location-${location.id}`}
                    />
                    <label className="text-sm">{location.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-service">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-service">
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
