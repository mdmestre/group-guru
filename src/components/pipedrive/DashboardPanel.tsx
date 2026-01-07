import { Deal, Pipeline, User, Activity } from "@/types/pipedrive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Smartphone,
  WifiOff,
  Loader2,
  QrCode,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { QRCodeSVG } from 'qrcode.react';

interface DashboardPanelProps {
  deals: Deal[];
  pipeline: Pipeline;
  users: User[];
  activities: Activity[];
}

export function DashboardPanel({
  deals,
  pipeline,
  users,
  activities,
}: DashboardPanelProps) {
  const openDeals = deals.filter(d => d.status === "open");
  const wonDeals = deals.filter(d => d.status === "won");
  const lostDeals = deals.filter(d => d.status === "lost");

  const totalOpenValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const totalWonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const totalLostValue = lostDeals.reduce((sum, d) => sum + d.value, 0);

  const conversionRate = wonDeals.length + lostDeals.length > 0
    ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1)
    : "0";

  // Pipeline Stats por Etapa
  const pipelineStats = pipeline.stages.map(stage => {
    const stageDeals = openDeals.filter(d => d.stageId === stage.id);
    const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = stageDeals.reduce(
      (sum, d) => sum + (d.value * (d.probability || stage.probability)) / 100,
      0
    );

    // Calcular taxa de conversão para próxima etapa
    const nextStage = pipeline.stages.find(s => s.order === stage.order + 1);
    let conversionRate = 0;
    if (nextStage) {
      const nextStageDeals = openDeals.filter(d => d.stageId === nextStage.id);
      conversionRate = stageDeals.length > 0
        ? (nextStageDeals.length / stageDeals.length) * 100
        : 0;
    }

    return {
      stage,
      dealCount: stageDeals.length,
      totalValue: stageValue,
      weightedValue,
      conversionRate,
    };
  });

  // Performance por Usuário
  const userPerformance = users.map(user => {
    const userDeals = deals.filter(d => d.ownerId === user.id);
    const userWon = userDeals.filter(d => d.status === "won");
    const userWonValue = userWon.reduce((sum, d) => sum + d.value, 0);
    const userOpen = userDeals.filter(d => d.status === "open");
    const userOpenValue = userOpen.reduce((sum, d) => sum + d.value, 0);

    return {
      user,
      totalDeals: userDeals.length,
      wonDeals: userWon.length,
      wonValue: userWonValue,
      openDeals: userOpen.length,
      openValue: userOpenValue,
      winRate: userDeals.length > 0 ? ((userWon.length / userDeals.length) * 100).toFixed(1) : "0",
    };
  });

  // Atividades Stats
  const completedActivities = activities.filter(a => a.status === "done").length;
  const pendingActivities = activities.filter(a => a.status === "open").length;
  const overdueActivities = activities.filter(a => a.status === "overdue").length;

  // WhatsApp Connection Status (tempo real via Socket.IO)
  const whatsappStatus = useWhatsAppConnection();

  return (
    <div className="space-y-6">
      {/* WhatsApp Status Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-neutral-900">
            {whatsappStatus.status === 'connected' ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <QrCode className="h-5 w-5 text-amber-600" />
            )}
            Status da Conexão WhatsApp
          </CardTitle>
          <CardDescription>Status da conexão WhatsApp em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          {/* ESTADO 1: AGUARDANDO LEITURA DO QR */}
          {(whatsappStatus.status === 'waiting_qr' || whatsappStatus.status === 'connecting') && whatsappStatus.qrCode && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                {whatsappStatus.qrCode && typeof whatsappStatus.qrCode === 'string' && whatsappStatus.qrCode.length > 0 ? (
                  <QRCodeSVG value={whatsappStatus.qrCode} size={200} />
                ) : (
                  <div className="h-[200px] w-[200px] flex items-center justify-center text-sm text-gray-500">
                    Erro ao gerar QR Code
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-blue-800 font-medium animate-pulse">
                Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho
              </p>
            </div>
          )}

          {/* ESTADO 2: CONECTADO */}
          {whatsappStatus.status === 'connected' && (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-green-700">Sistema Online</p>
                <p className="text-sm text-green-600">
                  Pronto para enviar mensagens e automações.
                  {whatsappStatus.phoneNumber && <span> ({whatsappStatus.phoneNumber})</span>}
                </p>
              </div>
            </div>
          )}

          {/* ESTADO 3: DESCONECTADO (SEM QR) */}
          {whatsappStatus.status === 'disconnected' && (
            <div className="flex items-center gap-4 py-4 opacity-70">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                <WifiOff className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-gray-600">Servidor desconectado ou aguardando inicialização...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 0,
                  }).format(totalOpenValue)}
                </p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pipeline Aberto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 0,
                  }).format(totalWonValue)}
                </p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Ganhos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{conversionRate}%</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Taxa de Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{openDeals.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Negócios Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Analysis */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Análise do Funil</CardTitle>
            <CardDescription>Estatísticas por etapa do pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineStats.map((stat) => (
                <div key={stat.stage.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stat.stage.color }}
                      />
                      <span className="text-sm font-medium text-neutral-900">{stat.stage.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-neutral-900">
                        {stat.dealCount} negócios
                      </span>
                      <span className="text-xs text-neutral-500 ml-2">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 0,
                        }).format(stat.totalValue)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-1">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${(stat.dealCount / Math.max(...pipelineStats.map(s => s.dealCount), 1)) * 100}%`,
                        backgroundColor: stat.stage.color,
                      }}
                    />
                  </div>
                  {stat.conversionRate > 0 && (
                    <div className="flex items-center gap-1 text-xs text-neutral-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>Taxa de conversão: {stat.conversionRate.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Desempenho da Equipe</CardTitle>
            <CardDescription>Métricas por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPerformance.map((perf) => (
                <div key={perf.user.id} className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-600">
                          {perf.user.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{perf.user.name}</p>
                        <p className="text-xs text-neutral-600">{perf.totalDeals} negócios totais</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {perf.winRate}% taxa
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Ganhos</p>
                      <p className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 0,
                        }).format(perf.wonValue)}
                      </p>
                      <p className="text-xs text-neutral-500">{perf.wonDeals} negócios</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Em Aberto</p>
                      <p className="text-lg font-bold text-blue-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 0,
                        }).format(perf.openValue)}
                      </p>
                      <p className="text-xs text-neutral-500">{perf.openDeals} negócios</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activities Summary */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Resumo de Atividades</CardTitle>
            <CardDescription>Status das atividades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-neutral-900">Concluídas</p>
                    <p className="text-sm text-neutral-600">{completedActivities} atividades</p>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                  {completedActivities}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="font-semibold text-neutral-900">Pendentes</p>
                    <p className="text-sm text-neutral-600">{pendingActivities} atividades</p>
                  </div>
                </div>
                <Badge className="bg-amber-600 text-white text-lg px-3 py-1">
                  {pendingActivities}
                </Badge>
              </div>
              {overdueActivities > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-semibold text-neutral-900">Atrasadas</p>
                      <p className="text-sm text-neutral-600">{overdueActivities} atividades</p>
                    </div>
                  </div>
                  <Badge className="bg-red-600 text-white text-lg px-3 py-1">
                    {overdueActivities}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Funil de Conversão</CardTitle>
            <CardDescription>Taxa de conversão por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineStats.map((stat, index) => {
                const prevStat = index > 0 ? pipelineStats[index - 1] : null;
                const conversion = prevStat && prevStat.dealCount > 0
                  ? ((stat.dealCount / prevStat.dealCount) * 100).toFixed(1)
                  : "100";
                const isPositive = parseFloat(conversion) >= 50;

                return (
                  <div key={stat.stage.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-neutral-900">{stat.stage.name}</span>
                        <span className="text-sm font-semibold text-neutral-900">{stat.dealCount}</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${(stat.dealCount / Math.max(...pipelineStats.map(s => s.dealCount), 1)) * 100}%`,
                            backgroundColor: stat.stage.color,
                          }}
                        />
                      </div>
                    </div>
                    {prevStat && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        isPositive ? "text-green-600" : "text-red-600"
                      )}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {conversion}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

