import { useDroppable } from "@dnd-kit/core";
import type { PipelineStage, Lead } from "@shared/schema";
import { LeadCard } from "./lead-card.tsx";

interface StageColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function StageColumn({ stage, leads, onLeadClick }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalValue = leads.reduce(
    (sum, lead) => sum + Number(lead.value || 0),
    0
  );

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Stage header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color || "#3b82f6" }}
            />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {stage.name}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-stage-count-${stage.id}`}>
              {leads.length}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-stage-value-${stage.id}`}>
          ${totalValue.toLocaleString()}
        </div>
      </div>

      {/* Leads container - Droppable area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 pb-24
          min-h-[500px] transition-all duration-200
          ${isOver ? "bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-400 scale-[1.02]" : ""}
        `}
        style={{ minWidth: '300px' }}
        data-testid={`droppable-stage-${stage.id}`}
      >
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))}
          {leads.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
              Sin leads
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
