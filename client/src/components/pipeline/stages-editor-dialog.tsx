import { useState, useEffect, useRef } from "react";
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
  pipelineId: string | null;
}

function SortableStageItem({
  stage,
  onUpdate,
  onDelete,
  isNew,
}: {
  stage: PipelineStage;
  onUpdate: (id: string, data: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  isNew?: boolean;
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
      className={`flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg ${
        isNew ? 'ring-2 ring-green-500 ring-offset-2 animate-pulse' : ''
      }`}
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

export function StagesEditorDialog({ stages, leads, pipelineId }: StagesEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

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
      queryClient.invalidateQueries({ queryKey: [`/api/pipeline/stages?pipelineId=${pipelineId}`] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pipeline/stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pipeline/stages?pipelineId=${pipelineId}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/pipeline/stages?pipelineId=${pipelineId}`] });
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
      return apiRequest("POST", "/api/pipeline/stages", { ...data, pipelineId });
    },
    onSuccess: async (data: any) => {
      // Invalidate to refetch all stages
      await queryClient.invalidateQueries({ queryKey: [`/api/pipeline/stages?pipelineId=${pipelineId}`] });
      
      // After refetch, persist the reordered stages to backend
      // This ensures the new stage stays at the beginning
      const refetchedStages = queryClient.getQueryData([`/api/pipeline/stages?pipelineId=${pipelineId}`]) as PipelineStage[];
      if (refetchedStages && data?.id) {
        // Find the new stage and make sure it's at order 0
        const reorderedStages = refetchedStages
          .sort((a, b) => {
            // New stage first, then others by current order
            if (a.id === data.id) return -1;
            if (b.id === data.id) return 1;
            return a.order - b.order;
          })
          .map((stage, index) => ({
            id: stage.id,
            order: index,
          }));
        
        // Persist the new order to backend
        await apiRequest("PATCH", "/api/pipeline/stages/reorder", { stages: reorderedStages });
        await queryClient.invalidateQueries({ queryKey: [`/api/pipeline/stages?pipelineId=${pipelineId}`] });
      }
      
      toast({
        title: "Etapa creada",
        description: "La nueva etapa se creó exitosamente",
      });
      
      // Update the newly created ID to the real one from backend
      if (data?.id) {
        setNewlyCreatedId(data.id);
        // Clear highlight after 5 seconds
        setTimeout(() => setNewlyCreatedId(null), 5000);
      }
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
    // Save current order to server - filter out stages without valid IDs
    const reorderedStages = localStages
      .filter(stage => stage.id && stage.id.length > 0)
      .map((stage, index) => ({
        id: stage.id,
        order: index,
      }));
    
    console.log("🔍 Saving stage order:", reorderedStages);
    reorderStages.mutate(reorderedStages);
  };

  const handleUpdate = (id: string, data: { name?: string; color?: string }) => {
    // Skip API call for temporary IDs
    if (id.startsWith('temp-')) {
      setLocalStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      return;
    }
    
    // Update local state immediately for smooth UX
    setLocalStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
    
    // Debounce API call to avoid cutting text while typing
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }
    
    debounceTimers.current[id] = setTimeout(() => {
      updateStage.mutate({ id, data });
      delete debounceTimers.current[id];
    }, 1500); // Aumentado de 800ms a 1500ms
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
    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    
    // Optimistically add new stage at the beginning
    const newStage: PipelineStage = {
      id: tempId,
      tenantId: "",
      pipelineId: pipelineId || "",
      name: "Nueva Etapa",
      order: 0,
      color: "#3b82f6",
      isFixed: false,
      createdAt: new Date(),
    };
    
    // Update local state immediately - add at beginning and increment other orders
    setLocalStages((prev) => {
      const updatedOthers = prev.map(s => ({ ...s, order: s.order + 1 }));
      return [newStage, ...updatedOthers];
    });
    
    // Track as newly created for visual highlight
    setNewlyCreatedId(tempId);
    
    // Create in backend
    createStage.mutate({
      name: "Nueva Etapa",
      order: 0,
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
                      isNew={stage.id === newlyCreatedId}
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
