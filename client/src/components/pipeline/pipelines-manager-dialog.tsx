import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Pipeline } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PipelinesManagerDialogProps {
  pipelines: Pipeline[];
}

export function PipelinesManagerDialog({ pipelines }: PipelinesManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createPipeline = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/pipelines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      toast({
        title: "Pipeline creado",
        description: "El nuevo pipeline se creó exitosamente",
      });
      setIsCreating(false);
      setName("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el pipeline",
        variant: "destructive",
      });
    },
  });

  const updatePipeline = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      return apiRequest("PATCH", `/api/pipelines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      toast({
        title: "Pipeline actualizado",
        description: "El pipeline se actualizó exitosamente",
      });
      setEditingId(null);
      setName("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el pipeline",
        variant: "destructive",
      });
    },
  });

  const deletePipeline = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pipelines/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      toast({
        title: "Pipeline eliminado",
        description: "El pipeline se eliminó exitosamente",
      });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el pipeline",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (pipeline: Pipeline) => {
    setEditingId(pipeline.id);
    setName(pipeline.name);
    setDescription(pipeline.description || "");
  };

  const handleSaveEdit = () => {
    if (editingId && name.trim()) {
      updatePipeline.mutate({
        id: editingId,
        data: { name: name.trim(), description: description.trim() || undefined },
      });
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      createPipeline.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deletePipeline.mutate(deleteId);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-manage-pipelines">
            <Plus className="w-4 h-4 mr-2" />
            Gestionar Pipelines
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Pipelines</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lista de pipelines existentes */}
            <div className="space-y-2">
              {pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                >
                  {editingId === pipeline.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre del pipeline"
                        data-testid={`input-edit-pipeline-name-${pipeline.id}`}
                      />
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descripción (opcional)"
                        rows={2}
                        data-testid={`input-edit-pipeline-description-${pipeline.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!name.trim() || updatePipeline.isPending}
                          data-testid={`button-save-pipeline-${pipeline.id}`}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setName("");
                            setDescription("");
                          }}
                          data-testid={`button-cancel-edit-pipeline-${pipeline.id}`}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {pipeline.name}
                          </h3>
                          {pipeline.isDefault && (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                              <Star className="w-3 h-3 fill-current" />
                              Principal
                            </span>
                          )}
                        </div>
                        {pipeline.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {pipeline.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(pipeline)}
                          data-testid={`button-edit-pipeline-${pipeline.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!pipeline.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pipeline.id)}
                            data-testid={`button-delete-pipeline-${pipeline.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Formulario para crear nuevo pipeline */}
            {isCreating ? (
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Nuevo Pipeline</h3>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del pipeline"
                  data-testid="input-new-pipeline-name"
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción (opcional)"
                  rows={2}
                  data-testid="input-new-pipeline-description"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreate}
                    disabled={!name.trim() || createPipeline.isPending}
                    data-testid="button-create-pipeline"
                  >
                    Crear Pipeline
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setName("");
                      setDescription("");
                    }}
                    data-testid="button-cancel-create-pipeline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsCreating(true)}
                className="w-full"
                data-testid="button-show-create-form"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Pipeline
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el pipeline y todas sus etapas y leads asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-pipeline">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-pipeline"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
