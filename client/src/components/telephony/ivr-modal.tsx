import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useCreateIvr, useUpdateIvr } from "@/hooks/use-telephony";
import type { IvrMenu } from "@shared/schema";

const ivrOptionSchema = z.object({
  key: z
    .string()
    .min(1, "Tecla requerida")
    .regex(/^[0-9*#]$/, "Solo se permiten números del 0-9, * o #")
    .refine(
      (val) => val === "*" || val === "#" || (parseInt(val) >= 0 && parseInt(val) <= 9),
      "Tecla debe ser 0-9, * o #"
    ),
  action: z
    .string()
    .min(1, "Acción requerida")
    .refine(
      (val) => ["transfer", "queue", "hangup", "repeat"].includes(val),
      "Acción debe ser transfer, queue, hangup o repeat"
    ),
  destination: z
    .string()
    .min(1, "Destino requerido")
    .max(50, "Máximo 50 caracteres"),
});

const ivrSchema = z.object({
  name: z
    .string()
    .min(1, "Nombre requerido")
    .min(3, "Mínimo 3 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_]+$/, "Solo letras, números, espacios, guiones y guiones bajos"),
  greetingUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\//.test(val),
      "URL debe comenzar con http:// o https://"
    ),
  options: z
    .array(ivrOptionSchema)
    .min(1, "Al menos una opción requerida")
    .max(10, "Máximo 10 opciones permitidas")
    .refine(
      (options) => {
        const keys = options.map(opt => opt.key);
        return new Set(keys).size === keys.length;
      },
      "No puede haber teclas duplicadas"
    ),
});

type IvrFormData = z.infer<typeof ivrSchema>;

interface IvrModalProps {
  isOpen: boolean;
  onClose: () => void;
  ivr?: IvrMenu | null;
  mode: "create" | "edit";
}

export function IvrModal({ isOpen, onClose, ivr, mode }: IvrModalProps) {
  const createMutation = useCreateIvr();
  const updateMutation = useUpdateIvr();

  // Handle both string and object formats for backward compatibility
  const defaultOptions = ivr?.options 
    ? (typeof ivr.options === 'string' ? JSON.parse(ivr.options || "[]") : ivr.options)
    : [{ key: "1", action: "transfer", destination: "101" }];

  const form = useForm<IvrFormData>({
    resolver: zodResolver(ivrSchema),
    defaultValues: {
      name: "",
      greetingUrl: "",
      options: [{ key: "1", action: "transfer", destination: "101" }],
    },
  });

  // Reset form when IVR or mode changes
  useEffect(() => {
    if (ivr && mode === "edit") {
      // Handle both string and object formats for backward compatibility
      const ivrOptions = typeof ivr.options === 'string' 
        ? JSON.parse(ivr.options || "[]") 
        : ivr.options || defaultOptions;
      
      form.reset({
        name: ivr.name || "",
        greetingUrl: ivr.greetingUrl || "",
        options: ivrOptions,
      });
    } else if (mode === "create") {
      form.reset({
        name: "",
        greetingUrl: "",
        options: [{ key: "1", action: "transfer", destination: "101" }],
      });
    }
  }, [ivr, mode, form, defaultOptions]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const onSubmit = async (data: IvrFormData) => {
    try {
      const ivrData = {
        name: data.name,
        greetingUrl: data.greetingUrl || null,
        options: data.options, // Send as actual JSON object, not stringified
      };

      if (mode === "create") {
        await createMutation.mutateAsync(ivrData);
      } else if (ivr) {
        await updateMutation.mutateAsync({ id: ivr.id, data: ivrData });
      }
      onClose();
      form.reset();
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  const addOption = () => {
    append({ key: "", action: "transfer", destination: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-ivr">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Crear Nuevo IVR" : "Editar IVR"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Configura un nuevo menú de respuesta automática." 
              : "Modifica la configuración del menú IVR seleccionado."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del IVR</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ej. Menú Principal"
                      data-testid="input-ivr-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="greetingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Saludo (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://example.com/audio/greeting.mp3"
                      data-testid="input-greeting-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Opciones del Menú</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  data-testid="button-add-option"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Opción
                </Button>
              </div>

              {form.watch("options")?.map((option, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`options.${index}.key`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Tecla</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="1"
                            maxLength={1}
                            data-testid={`input-option-key-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`options.${index}.action`}
                    render={({ field }) => (
                      <FormItem className="flex-2">
                        <FormLabel>Acción</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="transfer"
                            data-testid={`input-option-action-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`options.${index}.destination`}
                    render={({ field }) => (
                      <FormItem className="flex-2">
                        <FormLabel>Destino</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="101"
                            data-testid={`input-option-destination-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-option-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

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
                data-testid="button-save-ivr"
              >
                {(createMutation.isPending || updateMutation.isPending) 
                  ? "Guardando..." 
                  : mode === "create" 
                    ? "Crear IVR" 
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