import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Settings, Search } from "lucide-react";
import type { PipelineStage, Lead } from "@shared/schema";
import { StageColumn } from "@/components/pipeline/stage-column.tsx";
import { LeadCard } from "@/components/pipeline/lead-card.tsx";
import { NewLeadDialog } from "@/components/pipeline/new-lead-dialog.tsx";
import { StagesEditorDialog } from "@/components/pipeline/stages-editor-dialog.tsx";
import { LeadDetailsDialog } from "@/components/pipeline/lead-details-dialog.tsx";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PipelinePage() {
  const { toast } = useToast();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/pipeline/stages"],
  });

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/pipeline/leads"],
  });

  // Fetch metrics
  const { data: metrics } = useQuery<{
    totalValue: number;
    conversionRate: number;
    avgClosingDays: number;
    wonCount: number;
    wonValue: number;
    lostValue: number;
    totalCount: number;
  }>({
    queryKey: ["/api/pipeline/metrics"],
  });

  // Move lead mutation
  const moveLead = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      return apiRequest("PATCH", `/api/pipeline/leads/${leadId}/move`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/metrics"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo mover el lead",
        variant: "destructive",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const leadId = active.id as string;
      const stageId = over.id as string;

      // Verificar si over.id es un stage
      const isStage = stages.some((s) => s.id === stageId);
      if (isStage) {
        moveLead.mutate({ leadId, stageId });
      }
    }

    setActiveLead(null);
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort stages by order field
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Group leads by stage
  const leadsByStage = sortedStages.reduce(
    (acc, stage) => {
      acc[stage.id] = filteredLeads.filter((lead) => lead.stageId === stage.id);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  const isLoading = stagesLoading || leadsLoading;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header with metrics */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-pipeline-title">
            Pipeline de Ventas
          </h1>
          <div className="flex items-center gap-2">
            <StagesEditorDialog stages={sortedStages} leads={leads} />
            <NewLeadDialog stages={sortedStages} />
          </div>
        </div>

        {/* Inline metrics */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Valor Total:</span>
            <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-total-value">
              ${metrics?.totalValue.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Tasa Conversión:</span>
            <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-conversion-rate">
              {metrics?.conversionRate || 0}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Ganados:</span>
            <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-won-count">
              {metrics?.wonCount || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Valor Ganado:</span>
            <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-won-value">
              ${metrics?.wonValue?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Valor Perdido:</span>
            <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-lost-value">
              ${metrics?.lostValue?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Total Leads:</span>
            <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-total-count">
              {metrics?.totalCount || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Tiempo Promedio:</span>
            <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-avg-closing-days">
              {metrics?.avgClosingDays || 0} días
            </span>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">Cargando pipeline...</div>
              </div>
            ) : (
              <div className="flex gap-4 h-full">
                <SortableContext
                  items={sortedStages.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {sortedStages.map((stage) => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      leads={leadsByStage[stage.id] || []}
                      onLeadClick={setSelectedLead}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead details dialog */}
      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          stages={sortedStages}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
