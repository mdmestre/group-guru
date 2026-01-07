import { Link } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { 
  useDashboardMetrics, 
  useDashboardActivities, 
  useDashboardConnections 
} from "@/hooks/useDashboard";
import { useContactStats } from "@/hooks/useContacts";
import { useConnectionStats } from "@/hooks/useConnections";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down";
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, trend, icon, color }: MetricCardProps) {
  return (
    <Card className="border-neutral-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-neutral-900 mb-3">{value}</p>
            <div className="flex items-center gap-2">
              {trend === "up" ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend === "up" ? "text-green-600" : "text-red-600"
              )}>
                {change > 0 ? "+" : ""}{change}%
              </span>
              <span className="text-sm text-neutral-500">vs mês anterior</span>
            </div>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            color.replace("text-", "bg-").replace("-600", "-100")
          )}>
            <div className={color}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  // Fetch real-time data
  const metricsQuery = useDashboardMetrics();
  const activitiesQuery = useDashboardActivities(10);
  const connectionsQuery = useDashboardConnections();
  const contactStatsQuery = useContactStats();

  // Handle loading states
  const isLoading = metricsQuery.isLoading || activitiesQuery.isLoading || connectionsQuery.isLoading;
  const hasError = metricsQuery.isError || activitiesQuery.isError || connectionsQuery.isError;
  const error = metricsQuery.error || activitiesQuery.error || connectionsQuery.error;

  if (isLoading) {
    return <LoadingState message="Carregando dashboard..." />;
  }

  if (hasError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Erro ao carregar dashboard"}
        onRetry={() => {
          metricsQuery.refetch();
          activitiesQuery.refetch();
          connectionsQuery.refetch();
        }}
      />
    );
  }

  const metrics = metricsQuery.data;
  const activities = activitiesQuery.data;
  const connections = connectionsQuery.data;
  const contactStats = contactStatsQuery.data;

  const metricCards: MetricCardProps[] = [
    {
      title: "Mensagens Enviadas",
      value: metrics?.messagesTotal?.sent?.toLocaleString() || "0",
      change: metrics?.messagesTotal?.trend || 0,
      trend: (metrics?.messagesTotal?.trend || 0) >= 0 ? "up" : "down",
      icon: <Send className="h-5 w-5" />,
      color: "text-green-600"
    },
    {
      title: "Taxa de Resposta",
      value: `${metrics?.responseRate?.rate?.toFixed(1) || "0"}%`,
      change: metrics?.responseRate?.trend || 0,
      trend: (metrics?.responseRate?.trend || 0) >= 0 ? "up" : "down",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-blue-600"
    },
    {
      title: "Contatos Ativos",
      value: contactStats?.active?.toLocaleString() || "0",
      change: 0,
      trend: "up",
      icon: <Users className="h-5 w-5" />,
      color: "text-purple-600"
    },
    {
      title: "Conversões",
      value: metrics?.conversions?.count?.toLocaleString() || "0",
      change: metrics?.conversions?.trend || 0,
      trend: (metrics?.conversions?.trend || 0) >= 0 ? "up" : "down",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-amber-600"
    }
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-600 mt-1">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-neutral-200">
            <Calendar className="h-4 w-4 mr-2" />
            Últimos 30 dias
          </Button>
          <Link to="/app/crm">
            <Button className="bg-primary-600 hover:bg-primary-700 text-white">
              <Zap className="h-4 w-4 mr-2" />
              Nova Ação
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-2 border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Atividade Recente</CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {!activities || activities.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-12 w-12" />}
                title="Nenhuma atividade"
                description="As atividades aparecerão aqui"
                fullHeight={false}
              />
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {activity.contactName ? `${activity.contactName} • ` : ''}
                        {format(new Date(activity.timestamp), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-neutral-200 flex-shrink-0">
                      {activity.type === 'message_received' && 'Mensagem'}
                      {activity.type === 'message_sent' && 'Enviado'}
                      {activity.type === 'contact_added' && 'Novo'}
                      {activity.type === 'campaign_launched' && 'Campanha'}
                      {activity.type === 'campaign_completed' && 'Concluído'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connections Status */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Conexões WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!connections || connections.length === 0 ? (
              <EmptyState
                title="Nenhuma conexão"
                description="Configure sua primeira conexão WhatsApp"
                actionLabel="Conectar"
                onAction={() => window.location.href = '/app/connections'}
                fullHeight={false}
              />
            ) : (
              connections.map((conn) => (
                <div 
                  key={conn.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {conn.status === 'connected' ? (
                      <Wifi className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate text-sm">
                        {conn.phoneNumber || conn.name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {conn.status === 'connected' ? 'Conectado' : 
                         conn.status === 'connecting' ? 'Conectando...' : 
                         'Desconectado'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {conn.messageCount}
                    </p>
                    <p className="text-xs text-neutral-600">msgs</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/app/crm"
          className="group p-6 rounded-xl border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 group-hover:bg-primary-200 transition-colors flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                Gerenciar CRM
              </h3>
              <p className="text-sm text-neutral-600 mt-1">Contatos e pipeline</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link
          to="/app/conversations"
          className="group p-6 rounded-xl border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 group-hover:text-green-600 transition-colors">
                Conversas
              </h3>
              <p className="text-sm text-neutral-600 mt-1">Atender mensagens</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-neutral-400 group-hover:text-green-600 transition-colors" />
          </div>
        </Link>

        <Link
          to="/app/crm?tab=campaigns"
          className="group p-6 rounded-xl border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                Campanhas
              </h3>
              <p className="text-sm text-neutral-600 mt-1">Criar automações</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
