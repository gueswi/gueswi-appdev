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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Volume2, Play, Loader2 } from "lucide-react";
import { useCreateIvr, useUpdateIvr } from "@/hooks/use-telephony";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  // TTS fields
  greetingText: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length <= 500,
      "El texto no puede exceder 500 caracteres"
    ),
  voiceType: z
    .enum(["male", "female", "neutral"])
    .optional(),
  voiceStyle: z
    .enum(["formal", "friendly", "energetic", "calm"])
    .optional(),
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
  const { toast } = useToast();
  
  // TTS state
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Handle both string and object formats for backward compatibility
  const defaultOptions = ivr?.options 
    ? (typeof ivr.options === 'string' ? JSON.parse(ivr.options || "[]") : ivr.options)
    : [{ key: "1", action: "transfer", destination: "101" }];

  const form = useForm<IvrFormData>({
    resolver: zodResolver(ivrSchema),
    defaultValues: {
      name: "",
      greetingUrl: "",
      greetingText: "",
      voiceType: "female",
      voiceStyle: "friendly",
      options: [{ key: "1", action: "transfer", destination: "101" }],
    },
  });

  // TTS synthesis mutation
  const synthesizeMutation = useMutation({
    mutationFn: async (data: { text: string; voiceType: string; voiceStyle: string }) => {
      return apiRequest('POST', '/api/tts/synthesize', data);
    },
    onSuccess: (response: { audioUrl: string }) => {
      setGeneratedAudioUrl(response.audioUrl);
      // Auto-fill the greetingUrl with the generated audio
      form.setValue('greetingUrl', response.audioUrl);
      toast({
        title: "Audio generado",
        description: "El audio TTS se ha generado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al generar audio",
        description: error.message || "No se pudo generar el audio TTS",
        variant: "destructive",
      });
    },
  });

  // TTS generation handler
  const handleGenerateTTS = () => {
    const greetingText = form.getValues('greetingText');
    const voiceType = form.getValues('voiceType') || 'female';
    const voiceStyle = form.getValues('voiceStyle') || 'friendly';
    
    if (!greetingText?.trim()) {
      toast({
        title: "Texto requerido",
        description: "Ingresa el texto para generar el audio",
        variant: "destructive",
      });
      return;
    }
    
    synthesizeMutation.mutate({
      text: greetingText,
      voiceType,
      voiceStyle,
    });
  };

  // Audio preview handler with proper cleanup
  const handlePreviewAudio = () => {
    const audioUrl = generatedAudioUrl || form.getValues('greetingUrl');
    if (!audioUrl) {
      toast({
        title: "Sin audio",
        description: "No hay audio para reproducir",
        variant: "destructive",
      });
      return;
    }

    // Stop and cleanup any existing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    if (isPlaying) {
      setIsPlaying(false);
      return; // Just stop if already playing
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setIsPlaying(true);
    
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    };
    
    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
      toast({
        title: "Error de reproducción",
        description: "No se pudo reproducir el audio",
        variant: "destructive",
      });
    };
    
    audio.play().catch(() => {
      setIsPlaying(false);
      setCurrentAudio(null);
      toast({
        title: "Error de reproducción",
        description: "No se pudo reproducir el audio",
        variant: "destructive",
      });
    });
  };

  // Cleanup audio on component unmount or modal close
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isOpen && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  }, [isOpen, currentAudio]);

  // Reset form when IVR or mode changes
  useEffect(() => {
    if (ivr && mode === "edit") {
      // Handle both string and object formats for backward compatibility
      const ivrOptions = typeof ivr.options === 'string' 
        ? JSON.parse(ivr.options || "[]") 
        : ivr.options || [{ key: "1", action: "transfer", destination: "101" }];
      
      form.reset({
        name: ivr.name || "",
        greetingUrl: ivr.greetingUrl || "",
        greetingText: "",
        voiceType: "female",
        voiceStyle: "friendly",
        options: ivrOptions,
      });
    } else if (mode === "create") {
      form.reset({
        name: "",
        greetingUrl: "",
        greetingText: "",
        voiceType: "female",
        voiceStyle: "friendly",
        options: [{ key: "1", action: "transfer", destination: "101" }],
      });
    }
    setGeneratedAudioUrl(null);
  }, [ivr, mode, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const onSubmit = async (data: IvrFormData) => {
    try {
      const ivrData = {
        name: data.name,
        greetingUrl: data.greetingUrl || null,
        greetingText: data.greetingText || null,
        voiceType: data.voiceType || null,
        voiceStyle: data.voiceStyle || null,
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

            {/* TTS and Greeting Section */}
            <div className="space-y-4">
              <FormLabel>Configuración del Saludo</FormLabel>
              <Tabs defaultValue="tts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tts" data-testid="tab-tts">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generar con TTS
                  </TabsTrigger>
                  <TabsTrigger value="url" data-testid="tab-url">
                    URL de Audio
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tts" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="greetingText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto del Saludo</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Bienvenido a nuestra empresa. Por favor, seleccione una opción..."
                            rows={3}
                            maxLength={500}
                            disabled={synthesizeMutation.isPending}
                            data-testid="textarea-greeting-text"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          {(field.value?.length || 0)}/500 caracteres
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="voiceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Voz</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={synthesizeMutation.isPending}>
                              <SelectTrigger data-testid="select-voice-type">
                                <SelectValue placeholder="Seleccionar voz" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="female">Femenina</SelectItem>
                                <SelectItem value="male">Masculina</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="voiceStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estilo de Voz</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={synthesizeMutation.isPending}>
                              <SelectTrigger data-testid="select-voice-style">
                                <SelectValue placeholder="Seleccionar estilo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="friendly">Amigable</SelectItem>
                                <SelectItem value="energetic">Energético</SelectItem>
                                <SelectItem value="calm">Calmado</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleGenerateTTS}
                      disabled={synthesizeMutation.isPending}
                      data-testid="button-generate-tts"
                    >
                      {synthesizeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4 mr-2" />
                      )}
                      Generar Audio
                    </Button>
                    
                    {(generatedAudioUrl || form.watch('greetingUrl')) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreviewAudio}
                        disabled={isPlaying}
                        data-testid="button-preview-audio"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isPlaying ? "Reproduciendo..." : "Escuchar"}
                      </Button>
                    )}
                  </div>
                  
                  {generatedAudioUrl && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ Audio TTS generado correctamente
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="url" className="mt-4">
                  <FormField
                    control={form.control}
                    name="greetingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL del Audio</FormLabel>
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
                  
                  {form.watch('greetingUrl') && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviewAudio}
                      disabled={isPlaying}
                      data-testid="button-preview-url-audio"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isPlaying ? "Reproduciendo..." : "Escuchar"}
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>

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