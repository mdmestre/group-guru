import React, { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Target,
  Users,
  Building2,
  Activity as ActivityIcon,
  BarChart3,
  Settings,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Settings2,
  Filter as FilterIcon,
  Bot,
  Send
} from "lucide-react";
import { PipelineKanban } from "@/components/pipedrive/PipelineKanban";
import { DealDetails } from "@/components/pipedrive/DealDetails";
import { ActivitiesPanel } from "@/components/pipedrive/ActivitiesPanel";
import { PersonsPanel } from "@/components/pipedrive/PersonsPanel";
import { OrganizationsPanel } from "@/components/pipedrive/OrganizationsPanel";
import { DashboardPanel } from "@/components/pipedrive/DashboardPanel";
import { Deal, Pipeline, PipelineStage, User, Person, Organization, Activity } from "@/types/pipedrive";
import { cn } from "@/lib/utils";
import { useCRM } from "@/hooks/useCRM";
import { LoadingState, ErrorState, EmptyState, ErrorBoundary } from "@/components";
import { usePipelines, usePipeline } from "@/features/pipelines/hooks/usePipelines";
import { useContacts } from "@/hooks/useContacts";
import { useCRMRealtime } from "@/hooks/useRealtimeUpdates";

// Lazy load components for better performance
const PipelineBoard = lazy(() => import("@/features/pipelines/components/PipelineBoard").then(m => ({ default: m.PipelineBoard })));
const LeadScoringDashboard = lazy(() => import("@/features/lead-scoring/components/LeadScoringDashboard").then(m => ({ default: m.LeadScoringDashboard })));
const CustomFieldsManager = lazy(() => import("@/features/crm/components/CustomFieldsManager").then(m => ({ default: m.CustomFieldsManager })));
const SegmentBuilder = lazy(() => import("@/features/crm/components/SegmentBuilder").then(m => ({ default: m.SegmentBuilder })));
const AutomationsManager = lazy(() => import("@/features/automations/components/AutomationsManager").then(m => ({ default: m.AutomationsManager })));
const DisparosTab = lazy(() => import("@/features/campaigns/components/DisparosTab").then(m => ({ default: m.DisparosTab })));

export default function CRM() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  
  // Real-time updates para todos os recursos de CRM
  useCRMRealtime();
  
  // Fetch real data using hooks
  const { data: pipelines, isLoading: pipelinesLoading, error: pipelinesError } = usePipelines();
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useContacts();
  const { data: selectedPipeline, isLoading: pipelineLoading } = usePipeline(selectedPipelineId || '');

  // Set default pipeline when pipelines load
  React.useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.isActive) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  // Loading and error states
  if (pipelinesLoading || contactsLoading) {
    return <LoadingState message="Carregando dados do CRM..." />;
  }

  if (pipelinesError || contactsError) {
    return (
      <ErrorState
        message="Erro ao carregar dados do CRM"
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">CRM</h1>
          <p className="text-neutral-600 mt-1">Gerencie seus negócios, pipelines e vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-neutral-200">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{pipelines?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pipelines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{contacts?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contatos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">-</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lead Scoring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100">
                <FilterIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">-</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Segmentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-100 border border-neutral-200">
          <TabsTrigger
            value="pipeline"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <Target className="h-4 w-4 mr-2" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger
            value="lead-scoring"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <Award className="h-4 w-4 mr-2" />
            Lead Scoring
          </TabsTrigger>
          <TabsTrigger
            value="custom-fields"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Campos Customizados
          </TabsTrigger>
          <TabsTrigger
            value="segments"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Segmentos
          </TabsTrigger>
          <TabsTrigger
            value="automations"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <Bot className="h-4 w-4 mr-2" />
            Automações
          </TabsTrigger>
          <TabsTrigger
            value="disparos"
            className="data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Disparos
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando pipeline..." />}>
              {!pipelines?.length ? (
                <EmptyState
                  title="Nenhum pipeline encontrado"
                  description="Crie seu primeiro pipeline para começar a gerenciar seus negócios"
                />
              ) : (
                <PipelineBoard
                  pipelineId={selectedPipelineId || undefined}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        {/* Lead Scoring Tab */}
        <TabsContent value="lead-scoring">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando lead scoring..." />}>
              <LeadScoringDashboard />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando campos customizados..." />}>
              <CustomFieldsManager />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando segmentos..." />}>
              <SegmentBuilder />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando automações..." />}>
              <AutomationsManager />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        {/* Disparos Tab */}
        <TabsContent value="disparos">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState message="Carregando disparos..." />}>
              <DisparosTab />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

