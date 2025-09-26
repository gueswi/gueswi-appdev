import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateExtension, useUpdateExtension } from "@/hooks/use-telephony";
import type { Extension } from "@shared/schema";

const extensionSchema = z.object({
  number: z
    .string()
    .min(1, "Número de extensión requerido")
    .max(10, "Máximo 10 caracteres")
    .regex(/^[0-9]+$/, "Solo se permiten números")
    .refine(
      (val) => parseInt(val) >= 100 && parseInt(val) <= 9999,
      "El número debe estar entre 100 y 9999"
    ),
  userName: z
    .string()
    .min(1, "Nombre de usuario requerido")
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo se permiten letras y espacios"),
  userId: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.length >= 3 && val.length <= 50),
      "ID de usuario debe tener entre 3 y 50 caracteres si se proporciona"
    ),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    errorMap: () => ({ message: "Estado debe ser Activa o Inactiva" }),
  }),
});

type ExtensionFormData = z.infer<typeof extensionSchema>;

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  extension?: Extension | null;
  mode: "create" | "edit";
}

export function ExtensionModal({ isOpen, onClose, extension, mode }: ExtensionModalProps) {
  const createMutation = useCreateExtension();
  const updateMutation = useUpdateExtension();

  const form = useForm<ExtensionFormData>({
    resolver: zodResolver(extensionSchema),
    defaultValues: {
      number: "",
      userName: "",
      userId: "",
      status: "ACTIVE",
    },
  });

  // Reset form when extension or mode changes
  useEffect(() => {
    if (extension && mode === "edit") {
      form.reset({
        number: extension.number || "",
        userName: extension.userName || "",
        userId: extension.userId || "",
        status: extension.status || "ACTIVE",
      });
    } else if (mode === "create") {
      form.reset({
        number: "",
        userName: "",
        userId: "",
        status: "ACTIVE",
      });
    }
  }, [extension, mode, form]);

  const onSubmit = async (data: ExtensionFormData) => {
    try {
      // Clear any previous errors
      form.clearErrors();
      
      if (mode === "create") {
        await createMutation.mutateAsync(data);
      } else if (extension) {
        await updateMutation.mutateAsync({ id: extension.id, data });
      }
      // Close modal only after successful mutation
      handleClose();
    } catch (error: any) {
      // Handle specific validation errors from the server
      if (error?.response?.status === 400) {
        const errorData = error.response.data;
        
        // Handle duplicate extension number
        if (errorData?.message?.includes("extension number")) {
          form.setError("number", {
            type: "manual",
            message: "Este número de extensión ya existe",
          });
        }
        
        // Handle other field-specific errors
        if (errorData?.field && errorData?.message) {
          form.setError(errorData.field, {
            type: "manual",
            message: errorData.message,
          });
        }
      }
      
      // Error notifications are handled in the hooks
      // Keep modal open so user can see error and retry
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-extension">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Crear Nueva Extensión" : "Editar Extensión"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Configura una nueva extensión telefónica para tu organización." 
              : "Modifica la configuración de la extensión seleccionada."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Extensión</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ej. 101"
                      data-testid="input-extension-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Usuario</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ej. Juan Pérez"
                      data-testid="input-user-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de Usuario (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Opcional - ID del usuario asignado"
                      data-testid="input-user-id"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-extension-status">
                        <SelectValue placeholder="Selecciona el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activa</SelectItem>
                      <SelectItem value="INACTIVE">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-extension"
              >
                {(createMutation.isPending || updateMutation.isPending) 
                  ? "Guardando..." 
                  : mode === "create" 
                    ? "Crear Extensión" 
                    : "Guardar Cambios"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}