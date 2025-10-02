import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Settings, Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PipelineStage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

interface StagesEditorDialogProps {
  stages: PipelineStage[];
}

function SortableStageItem({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: PipelineStage;
  onUpdate: (id: string, data: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      <input
        type="color"
        value={stage.color || "#3b82f6"}
        onChange={(e) => onUpdate(stage.id, { color: e.target.value })}
        className="w-8 h-8 rounded cursor-pointer"
        data-testid={`input-stage-color-${stage.id}`}
      />

      <Input
        value={stage.name}
        onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
        className="flex-1"
        data-testid={`input-stage-name-${stage.id}`}
      />

      {!stage.isFixed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(stage.id)}
          data-testid={`button-delete-stage-${stage.id}`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      )}
    </div>
  );
}

export function StagesEditorDialog({ stages }: StagesEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync local stages with prop changes
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateStage = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/pipeline/stages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/stages"] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pipeline/stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/stages"] });
      toast({
        title: "Etapa eliminada",
        description: "La etapa se eliminó exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la etapa",
        variant: "destructive",
      });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (stages: { id: string; order: number }[]) => {
      return apiRequest("PATCH", "/api/pipeline/stages/reorder", { stages });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/stages"] });
      toast({
        title: "Orden actualizado",
        description: "Las etapas se reordenaron exitosamente",
      });
    },
  });

  const createStage = useMutation({
    mutationFn: async (data: { name: string; order: number; color: string }) => {
      return apiRequest("POST", "/api/pipeline/stages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/stages"] });
      toast({
        title: "Etapa creada",
        description: "La nueva etapa se creó exitosamente",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localStages.findIndex((s) => s.id === active.id);
      const newIndex = localStages.findIndex((s) => s.id === over.id);

      const newStages = arrayMove(localStages, oldIndex, newIndex);
      setLocalStages(newStages);

      // Update order on server
      const reorderedStages = newStages.map((stage, index) => ({
        id: stage.id,
        order: index,
      }));
      reorderStages.mutate(reorderedStages);
    }
  };

  const handleUpdate = (id: string, data: { name?: string; color?: string }) => {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
    updateStage.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteStage.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleAddStage = () => {
    const newOrder = Math.max(...localStages.map((s) => s.order), -1) + 1;
    createStage.mutate({
      name: "Nueva Etapa",
      order: newOrder,
      color: "#3b82f6",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-edit-stages">
            <Settings className="w-4 h-4 mr-2" />
            Editar Etapas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Etapas del Pipeline</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localStages.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localStages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              onClick={handleAddStage}
              className="w-full"
              data-testid="button-add-stage"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Etapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Asegúrate de que no haya leads en esta
              etapa antes de eliminarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
