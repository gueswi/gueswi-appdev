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
import type { PipelineStage, Lead } from "@shared/schema";
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
  leads: Lead[];
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

export function StagesEditorDialog({ stages, leads }: StagesEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Count leads per stage (with safety check)
  const leadsPerStage = (leads || []).reduce((acc, lead) => {
    acc[lead.stageId] = (acc[lead.stageId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getLeadCount = (stageId: string) => leadsPerStage[stageId] || 0;
  const stageHasLeads = (stageId: string) => getLeadCount(stageId) > 0;

  // Sync local stages with prop changes
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
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
    onError: (error: any) => {
      console.error("Error reordering stages:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo reordenar las etapas",
        variant: "destructive",
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

    console.log("🔍 Drag end event:", { activeId: active.id, overId: over?.id });

    if (over && active.id !== over.id) {
      const oldIndex = localStages.findIndex((s) => s.id === active.id);
      const newIndex = localStages.findIndex((s) => s.id === over.id);

      console.log("🔍 Reordering stages:", { oldIndex, newIndex });

      const newStages = arrayMove(localStages, oldIndex, newIndex);
      setLocalStages(newStages);
    }
  };

  const handleSaveOrder = () => {
    // Save current order to server
    const reorderedStages = localStages.map((stage, index) => ({
      id: stage.id,
      order: index,
    }));
    
    console.log("🔍 Saving stage order:", reorderedStages);
    reorderStages.mutate(reorderedStages);
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleAddStage}
                className="flex-1"
                data-testid="button-add-stage"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Etapa
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={reorderStages.isPending}
                className="flex-1"
                data-testid="button-save-order"
              >
                Guardar Orden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteId && stageHasLeads(deleteId) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">⚠️ Esta etapa contiene {getLeadCount(deleteId)} lead(s)</p>
              <p>No puedes eliminar una etapa si hay leads en ella. Mueve los leads y deja esta etapa vacía para poder eliminarla.</p>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleteId ? stageHasLeads(deleteId) : false}
              data-testid="button-confirm-delete-stage"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
