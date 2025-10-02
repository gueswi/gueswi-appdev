import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@shared/schema";
import { Building2, Mail, Phone, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

export function LeadCard({ lead, onClick, isDragging = false }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggableActive,
  } = useDraggable({ id: lead.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging || isDraggableActive ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-600"
      data-testid={`card-lead-${lead.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm" data-testid={`text-lead-name-${lead.id}`}>
          {lead.name}
        </h4>
        {lead.probability && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>{lead.probability}%</span>
          </div>
        )}
      </div>

      {lead.company && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}

      {lead.value && (
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2" data-testid={`text-lead-value-${lead.id}`}>
          ${Number(lead.value).toLocaleString()} {lead.currency || "USD"}
        </div>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
