import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";

interface ServiceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const formSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().nullable().optional(),
  duration: z.number().min(1, "Duración debe ser al menos 1 minuto"),
  price: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  capacity: z.number().optional(),
  bufferTime: z.number().optional(),
  color: z.string().nullable().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function ServiceManagerDialog({
  open,
  onOpenChange,
  service,
}: ServiceManagerDialogProps) {
  const { toast } = useToast();
  const isEditing = !!service;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: service ? {
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price ? parseFloat(service.price) : null,
      currency: service.currency,
      capacity: service.capacity ?? 1,
      bufferTime: service.bufferTime ?? 0,
      color: service.color,
      isActive: service.isActive ?? true,
    } : {
      name: "",
      description: "",
      duration: 60,
      price: null,
      currency: "EUR",
      capacity: 1,
      bufferTime: 0,
      color: "#6366f1",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Servicio creado",
        description: "El servicio se ha creado exitosamente",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el servicio",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PATCH", `/api/services/${service!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Servicio actualizado",
        description: "El servicio se ha actualizado exitosamente",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el servicio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles del servicio"
              : "Completa el formulario para crear un nuevo servicio"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Consulta General"
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Describe el servicio..."
                      rows={3}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bufferTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo de Buffer (min)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || 0}
                        type="number"
                        min={0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-buffer-time"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tiempo entre citas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        step="0.01"
                        min={0}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                        }
                        placeholder="50.00"
                        data-testid="input-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || "EUR"}
                        placeholder="EUR"
                        data-testid="input-currency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || 1}
                        type="number"
                        min={1}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-capacity"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Máximo de personas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          value={field.value || "#6366f1"}
                          type="color"
                          className="w-16 h-10 p-1 cursor-pointer"
                          data-testid="input-color"
                        />
                        <Input
                          value={field.value || "#6366f1"}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#6366f1"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Servicio Activo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Los servicios inactivos no aparecerán para reservas
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar"
                  : "Crear Servicio"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
