import { Deal, User } from "@/types/pipedrive";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Calendar, 
  User as UserIcon, 
  MoreVertical,
  GripVertical,
  AlertCircle,
  Clock,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dealNeedsAttention, dealIsStuck } from "@/lib/crm/dealDomain";

interface DealCardProps {
  deal: Deal;
  owner?: User;
  personName?: string;
  organizationName?: string;
  hasRecentActivity?: boolean;
  onClick?: () => void;
  onQuickAction?: (action: "create_activity" | "view_details") => void;
}

export function DealCard({ 
  deal, 
  owner, 
  personName, 
  organizationName, 
  hasRecentActivity = false,
  onClick,
  onQuickAction
}: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Verificar se precisa de atenção
  const needsAttention = dealNeedsAttention(deal, 7);
  const isStuck = dealIsStuck(deal, 14);
  const daysInStage = deal.daysInCurrentStage ?? 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group relative cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary-300",
        "bg-white border-neutral-200",
        isDragging && "shadow-lg scale-105 z-50",
        needsAttention && !hasRecentActivity && "border-amber-300 bg-amber-50/30",
        isStuck && "border-red-300 bg-red-50/30"
      )}
      onClick={onClick}
    >
      <div className="p-4 space-y-3">
        {/* Drag Handle */}
        <button
          {...listeners}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-neutral-400" />
        </button>

        {/* Warning Indicators */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {needsAttention && !hasRecentActivity && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
              Sem atividade
            </Badge>
          )}
          {isStuck && (
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5 py-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {daysInStage}d parado
            </Badge>
          )}
        </div>

        {/* Title */}
        <div className="pr-6">
          <h3 className="font-semibold text-sm text-neutral-900 line-clamp-2">
            {deal.title}
          </h3>
        </div>

        {/* Value */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-bold text-base text-neutral-900">
            {formatCurrency(deal.value, deal.currency)}
          </span>
          {deal.probability !== undefined && (
            <Badge variant="outline" className="text-xs ml-auto">
              {deal.probability}%
            </Badge>
          )}
        </div>

        {/* Person/Organization */}
        {(personName || organizationName) && (
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="truncate">
              {personName || organizationName}
            </span>
          </div>
        )}

        {/* Expected Close Date */}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(deal.expectedCloseDate), "dd MMM", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Owner & Quick Actions */}
        {owner && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-600">
                  {owner.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <span className="text-xs text-neutral-600 truncate">
                {owner.name}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onQuickAction && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction("create_activity");
                  }}
                  title="Criar atividade rápida"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAction?.("view_details");
                }}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {deal.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {deal.tags.length > 2 && (
              <span className="text-[10px] text-neutral-500">+{deal.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

