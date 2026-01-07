import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Deal, Pipeline, PipelineStage, User, Person, Organization, Activity } from "@/types/pipedrive";
import { DealCard } from "./DealCard";
import { Plus, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineKanbanProps {
  pipeline: Pipeline;
  deals: Deal[];
  users: User[];
  persons: Person[];
  organizations: Organization[];
  activities: Activity[];
  onDealClick: (deal: Deal) => void;
  onDealMove: (dealId: string, newStageId: string) => void;
  onCreateDeal: (stageId: string) => void;
  onQuickAction?: (deal: Deal, action: "create_activity" | "view_details") => void;
}

interface StageColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  users: User[];
  persons: Person[];
  organizations: Organization[];
  activities: Activity[];
  onDealClick: (deal: Deal) => void;
  onCreateDeal: () => void;
  onQuickAction?: (deal: Deal, action: "create_activity" | "view_details") => void;
  isOver?: boolean;
}

function StageColumn({
  stage,
  deals,
  users,
  persons,
  organizations,
  activities,
  onDealClick,
  onCreateDeal,
  onQuickAction,
  isOver,
}: StageColumnProps) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce(
    (sum, deal) => sum + (deal.value * (deal.probability || stage.probability)) / 100,
    0
  );

  const getPersonName = (personId?: string) => {
    if (!personId) return undefined;
    return persons.find(p => p.id === personId)?.name;
  };

  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return undefined;
    return organizations.find(o => o.id === orgId)?.name;
  };

  const getOwner = (ownerId: string) => {
    return users.find(u => u.id === ownerId);
  };

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        className={cn(
          "h-full border-l-4 transition-all duration-200",
          `border-l-${stage.color}-500`,
          "bg-white border-r border-t border-b border-neutral-200",
          isOver && "ring-2 ring-primary-300 ring-offset-2 scale-[1.02]"
        )}
        style={{ borderLeftColor: stage.color }}
      >
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <h3 className="font-semibold text-sm text-neutral-900">
                {stage.name}
              </h3>
            </div>
            <Badge variant="secondary" className="font-semibold text-xs h-5 px-2">
              {deals.length}
            </Badge>
          </div>
          
          {/* Stage Stats */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Total</span>
              <span className="font-semibold text-neutral-900">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(totalValue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Ponderado</span>
              <span className="font-semibold text-neutral-700">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 0,
                }).format(weightedValue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Probabilidade</span>
              <span className="font-semibold text-neutral-700">{stage.probability}%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-2 min-h-[400px]">
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {deals.map((deal) => {
              const dealActivities = activities.filter(a => a.dealId === deal.id);
              const lastActivity = dealActivities
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              const hasRecentActivity = lastActivity 
                ? (Date.now() - new Date(lastActivity.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
                : false;

              return (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  owner={getOwner(deal.ownerId)}
                  personName={getPersonName(deal.personId)}
                  organizationName={getOrganizationName(deal.organizationId)}
                  hasRecentActivity={hasRecentActivity}
                  onClick={() => onDealClick(deal)}
                  onQuickAction={onQuickAction ? (action) => onQuickAction(deal, action) : undefined}
                />
              );
            })}
          </SortableContext>

          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50">
              <p className="text-xs font-medium text-neutral-500 mb-2">
                Nenhum negócio
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateDeal}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar negócio
              </Button>
            </div>
          )}

          {deals.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateDeal}
              className="w-full text-xs h-8 text-neutral-600 hover:text-neutral-900"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar negócio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PipelineKanban({
  pipeline,
  deals,
  users,
  persons,
  organizations,
  activities,
  onDealClick,
  onDealMove,
  onCreateDeal,
  onQuickAction,
}: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stageId === stageId && deal.status === "open");
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverStageId(null);
      return;
    }

    const overId = over.id as string;
    const stage = pipeline.stages.find((s) => s.id === overId);
    if (stage) {
      setOverStageId(stage.id);
    } else {
      const deal = deals.find((d) => d.id === overId);
      if (deal) {
        setOverStageId(deal.stageId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverStageId(null);

    if (!over) return;

    const activeDeal = deals.find((d) => d.id === active.id);
    if (!activeDeal) return;

    const targetStage = pipeline.stages.find((s) => s.id === over.id);
    if (targetStage && activeDeal.stageId !== targetStage.id) {
      onDealMove(activeDeal.id, targetStage.id);
      return;
    }

    const targetDeal = deals.find((d) => d.id === over.id);
    if (targetDeal && activeDeal.stageId !== targetDeal.stageId) {
      onDealMove(activeDeal.id, targetDeal.stageId);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverStageId(null);
  };

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 px-1 -mx-1">
        {pipeline.stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const isOver = overStageId === stage.id;

          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              users={users}
              persons={persons}
              organizations={organizations}
              activities={activities}
              onDealClick={onDealClick}
              onCreateDeal={() => onCreateDeal(stage.id)}
              onQuickAction={onQuickAction}
              isOver={isOver}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDeal ? (
          <div className="w-80 opacity-90 rotate-2 shadow-2xl">
            <DealCard
              deal={activeDeal}
              owner={users.find(u => u.id === activeDeal.ownerId)}
              personName={persons.find(p => p.id === activeDeal.personId)?.name}
              organizationName={organizations.find(o => o.id === activeDeal.organizationId)?.name}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

