import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import { useState } from "react";

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  const { data: stages } = useQuery({
    queryKey: ["/api/pipeline/stages"],
  });

  const { data: leads } = useQuery({
    queryKey: ["/api/pipeline/leads"],
  });

  const moveLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      newStageId,
    }: {
      leadId: string;
      newStageId: string;
    }) => {
      const res = await fetch(`/api/pipeline/leads/${leadId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to move lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    moveLeadMutation.mutate({
      leadId: active.id as string,
      newStageId: over.id as string,
    });
  };

  // Calcular totales
  const totalValue =
    leads?.reduce(
      (sum: number, lead: any) => sum + (parseFloat(lead.value) || 0),
      0,
    ) || 0;

  const wonValue =
    leads
      ?.filter((l: any) => l.stage?.name === "Ganado")
      .reduce(
        (sum: number, lead: any) => sum + (parseFloat(lead.value) || 0),
        0,
      ) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Ventas</h1>
          <p className="text-gray-600">Gestiona tus oportunidades</p>
        </div>
        <Button onClick={() => setShowNewLeadModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Lead
        </Button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <DollarSign className="h-4 w-4" />
            Valor Total Pipeline
          </div>
          <div className="text-2xl font-bold mt-1">
            ${totalValue.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-gray-600 text-sm">Ganado este mes</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            ${wonValue.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-gray-600 text-sm">Total Leads</div>
          <div className="text-2xl font-bold mt-1">{leads?.length || 0}</div>
        </Card>
      </div>

      {/* Kanban Board */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage: any) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={leads?.filter((l: any) => l.stageId === stage.id) || []}
            />
          ))}
        </div>
      </DndContext>

      {showNewLeadModal && (
        <NewLeadModal
          stages={stages}
          onClose={() => setShowNewLeadModal(false)}
        />
      )}
    </div>
  );
}

function PipelineColumn({ stage, leads }: any) {
  return (
    <div className="min-w-[300px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="font-semibold">{stage.name}</h3>
        <span className="text-sm text-gray-500">({leads.length})</span>
      </div>

      <SortableContext
        items={leads.map((l: any) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {leads.map((lead: any) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function LeadCard({ lead }: any) {
  return (
    <Card className="p-3 cursor-move hover:shadow-md transition-shadow">
      <div className="font-medium">{lead.name}</div>
      {lead.company && (
        <div className="text-sm text-gray-600">{lead.company}</div>
      )}
      {lead.value && (
        <div className="text-sm font-semibold text-green-600 mt-2">
          ${parseFloat(lead.value).toFixed(2)}
        </div>
      )}
      {lead.phone && (
        <div className="text-xs text-gray-500 mt-1">{lead.phone}</div>
      )}
    </Card>
  );
}

function NewLeadModal({ stages, onClose }: any) {
  // Implementar formulario para crear nuevo lead
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Nuevo Lead</h2>
        {/* Formulario aquí */}
        <Button onClick={onClose}>Cerrar</Button>
      </Card>
    </div>
  );
}
