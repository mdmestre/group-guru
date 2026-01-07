import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { api} from '@/lib/api';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin & Observabilidade</h1>
        <p className="text-muted-foreground mt-2">
          Monitoramento e debug do sistema
        </p>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="automations">Automation Debugger</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Monitor</TabsTrigger>
          <TabsTrigger value="jobs">Jobs & Filas</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogsViewer />
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <AutomationDebugger />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhookMonitor />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <JobsMonitor />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuditLogsViewer() {
  const [filters, setFilters] = useState({
    severity: '',
    resourceType: '',
    action: '',
    limit: '100'
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.action) params.append('action', filters.action);
      params.append('limit', filters.limit);

      const res = await api.get(`/admin/audit-logs?${params}`);
      return res.data;
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Histórico completo de ações do sistema
            </CardDescription>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select
            value={filters.severity}
            onValueChange={(v) => setFilters({ ...filters, severity: v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.resourceType}
            onValueChange={(v) => setFilters({ ...filters, resourceType: v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de Recurso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="automation">Automation</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.action}
            onValueChange={(v) => setFilters({ ...filters, action: v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {data?.logs?.map((log: any) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                      <span className="font-medium">{log.action}</span>
                      <span className="text-muted-foreground">
                        {log.resource_type}
                      </span>
                      {log.resource_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.resource_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'PPp')}
                    </div>
                    {log.user_email && (
                      <div className="text-xs text-muted-foreground">
                        Por: {log.user_email}
                      </div>
                    )}
                    {log.request_id && (
                      <div className="text-xs text-muted-foreground font-mono">
                        Request ID: {log.request_id.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
                {log.changes && Object.keys(log.changes).length > 0 && (
                  <div className="mt-2 text-xs space-y-1">
                    <div className="font-medium">Mudanças:</div>
                    {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                      <div key={key} className="pl-2">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="text-red-600">{JSON.stringify(value.old)}</span>
                        {' → '}
                        <span className="text-green-600">{JSON.stringify(value.new)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AutomationDebugger() {
  const [runId, setRunId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'automation-debugger', runId],
    queryFn: async () => {
      if (!runId) return null;
      const res = await api.get(`/admin/automation-debugger/${runId}`);
      return res.data;
    },
    enabled: !!runId
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Debugger</CardTitle>
        <CardDescription>
          Debug de execuções de automações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Run ID"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : data ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2">Run Info</div>
              <div className="text-sm space-y-1">
                <div>Status: <Badge>{data.run.status}</Badge></div>
                <div>Automation: {data.automation?.name}</div>
                <div>Criado em: {format(new Date(data.run.created_at), 'PPp')}</div>
                {data.run.completed_at && (
                  <div>Completado em: {format(new Date(data.run.completed_at), 'PPp')}</div>
                )}
                {data.run.error_message && (
                  <div className="text-destructive">Erro: {data.run.error_message}</div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2">Timeline</div>
              <div className="space-y-2">
                {data.timeline?.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                    <span>{log.nodeId}</span>
                    <span className="text-muted-foreground">({log.nodeType})</span>
                    {log.duration && (
                      <span className="text-muted-foreground">
                        {log.duration}ms
                      </span>
                    )}
                    {log.error && (
                      <span className="text-destructive text-xs">{log.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Digite um Run ID para visualizar
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WebhookMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'webhook-monitor'],
    queryFn: async () => {
      const res = await api.get('/admin/webhook-monitor');
      return res.data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhook Monitor</CardTitle>
            <CardDescription>
              Monitoramento de chamadas de webhooks
            </CardDescription>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {data?.calls?.map((call: any) => (
              <div
                key={call.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={call.status === 'success' ? 'default' : 'destructive'}>
                        {call.status}
                      </Badge>
                      <span className="font-medium">{call.webhook_name}</span>
                      <span className="text-muted-foreground">{call.event_type}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {call.url}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(call.created_at), 'PPp')}
                      {call.status_code && ` • HTTP ${call.status_code}`}
                      {call.response_time_ms && ` • ${call.response_time_ms}ms`}
                    </div>
                    {call.error_message && (
                      <div className="text-xs text-destructive mt-1">
                        {call.error_message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobsMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const res = await api.get('/admin/jobs');
      return res.data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'active': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Jobs & Filas</CardTitle>
            <CardDescription>
              Monitoramento de jobs e filas
            </CardDescription>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {data?.jobs?.map((job: any) => (
              <div
                key={job.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <span className="font-medium">{job.job_type}</span>
                      <span className="text-muted-foreground">{job.queue_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(job.created_at), 'PPp')}
                    </div>
                    {job.progress !== null && (
                      <div className="w-full bg-secondary rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                    {job.failed_reason && (
                      <div className="text-xs text-destructive mt-1">
                        {job.failed_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignAnalytics() {
  const [campaignId, setCampaignId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'campaign-analytics', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await api.get(`/admin/campaign-analytics/${campaignId}`);
      return res.data;
    },
    enabled: !!campaignId
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Analytics</CardTitle>
        <CardDescription>
          Análise de campanhas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Campaign ID"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold">{data.stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{data.stats.sent}</div>
                <div className="text-sm text-muted-foreground">Enviadas</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{data.stats.delivered}</div>
                <div className="text-sm text-muted-foreground">Entregues</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{data.stats.failed}</div>
                <div className="text-sm text-muted-foreground">Falhas</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Digite um Campaign ID para visualizar
          </div>
        )}
      </CardContent>
    </Card>
  );
}


