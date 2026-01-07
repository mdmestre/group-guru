import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Target,
  Award,
  Users,
  BarChart3,
} from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import {
  useScoringRules,
  useCreateScoringRule,
  useUpdateScoringRule,
  useDeleteScoringRule,
  useRecalculateAllScores,
  useLeadsByScoreRange,
} from '../hooks/useLeadScoring';
import { LeadScoringRule } from '../models/types';

export const LeadScoringDashboard: React.FC = () => {
  const [selectedRule, setSelectedRule] = useState<LeadScoringRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 100 });

  const { data: rules, isLoading: rulesLoading, error: rulesError, refetch: refetchRules } = useScoringRules();
  const { data: leadsByScore, isLoading: leadsLoading } = useLeadsByScoreRange({
    minScore: scoreRange.min,
    maxScore: scoreRange.max,
  });

  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule(selectedRule?.id || '');
  const deleteRule = useDeleteScoringRule();
  const recalculateAll = useRecalculateAllScores();

  if (rulesLoading) {
    return <LoadingState message="Carregando regras de pontuação..." fullHeight={true} />;
  }
  
  if (rulesError) {
    return (
      <ErrorState
        message="Erro ao carregar regras de pontuação"
        onRetry={() => refetchRules()}
        fullHeight={true}
      />
    );
  }

  // Ensure rules is an array before filtering
  const rulesArray = Array.isArray(rules) ? rules : [];
  const activeRules = rulesArray.filter(r => r.isActive);
  const inactiveRules = rulesArray.filter(r => !r.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Lead Scoring</h2>
          <p className="text-neutral-600 mt-1">Gerencie regras de pontuação e visualize leads por score</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => recalculateAll.mutate(undefined, {
              onSuccess: () => {
                // Show success toast
              },
            })}
            disabled={recalculateAll.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculateAll.isPending ? 'animate-spin' : ''}`} />
            Recalcular Todos
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Regra de Pontuação</DialogTitle>
                <DialogDescription>
                  Configure uma nova regra para pontuar leads automaticamente
                </DialogDescription>
              </DialogHeader>
              <CreateRuleForm
                onSubmit={(data) => {
                  createRule.mutate(data, {
                    onSuccess: () => {
                      setIsCreateDialogOpen(false);
                      refetchRules();
                    },
                    onError: (error: any) => {
                      console.error('Erro ao criar regra:', error);
                      alert(error.message || 'Erro ao criar regra de pontuação');
                    },
                  });
                }}
                isLoading={createRule.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{activeRules.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Regras Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{rules?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total de Regras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{leadsByScore?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Leads no Range</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">
                  {leadsByScore?.reduce((sum, lead) => sum + lead.score, 0) / (leadsByScore?.length || 1) || 0}
                </p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Score Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Regras de Pontuação</TabsTrigger>
          <TabsTrigger value="leads">Leads por Score</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras Ativas</CardTitle>
              <CardDescription>Regras que estão sendo aplicadas atualmente</CardDescription>
            </CardHeader>
            <CardContent>
              {activeRules.length === 0 ? (
                <EmptyState
                  title="Nenhuma regra ativa"
                  description="Crie sua primeira regra de pontuação para começar"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.ruleType}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">+{rule.points}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRule(rule);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar esta regra?')) {
                                  deleteRule.mutate(rule.id, {
                                    onSuccess: () => refetchRules(),
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {inactiveRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Regras Inativas</CardTitle>
                <CardDescription>Regras que não estão sendo aplicadas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.ruleType}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-neutral-600">+{rule.points}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Inativa</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRule(rule);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar esta regra?')) {
                                  deleteRule.mutate(rule.id, {
                                    onSuccess: () => refetchRules(),
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leads by Score Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leads por Score</CardTitle>
                  <CardDescription>Visualize leads filtrados por range de pontuação</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="min-score">Min:</Label>
                  <Input
                    id="min-score"
                    type="number"
                    value={scoreRange.min}
                    onChange={(e) => setScoreRange({ ...scoreRange, min: parseInt(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <Label htmlFor="max-score">Max:</Label>
                  <Input
                    id="max-score"
                    type="number"
                    value={scoreRange.max}
                    onChange={(e) => setScoreRange({ ...scoreRange, max: parseInt(e.target.value) || 100 })}
                    className="w-20"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <LoadingState message="Carregando leads..." />
              ) : !leadsByScore?.length ? (
                <EmptyState
                  title="Nenhum lead encontrado"
                  description="Ajuste o range de pontuação para ver leads"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Tendência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsByScore.map((lead) => (
                      <TableRow key={lead.contactId}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-blue-100 text-blue-700">
                            {lead.score}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {selectedRule && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Regra de Pontuação</DialogTitle>
              <DialogDescription>
                Atualize as configurações da regra de pontuação
              </DialogDescription>
            </DialogHeader>
            <EditRuleForm
              rule={selectedRule}
              onSubmit={(data) => {
                updateRule.mutate(data, {
                  onSuccess: () => {
                    setIsEditDialogOpen(false);
                    setSelectedRule(null);
                    refetchRules();
                  },
                });
              }}
              isLoading={updateRule.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Create Rule Form Component
interface CreateRuleFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const CreateRuleForm: React.FC<CreateRuleFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'interaction' as 'interaction' | 'field_value' | 'engagement' | 'custom',
    points: 10,
    criteria: {} as Record<string, any>,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Nome da regra é obrigatório');
      return;
    }
    
    if (formData.points === undefined || formData.points === null) {
      alert('Pontos são obrigatórios');
      return;
    }
    
    onSubmit({
      name: formData.name,
      description: formData.description,
      type: formData.type,
      points: formData.points,
      criteria: formData.criteria,
      active: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Regra</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          className="w-full p-2 border rounded-md"
        >
          <option value="interaction">Interação</option>
          <option value="field_value">Valor do Campo</option>
          <option value="engagement">Engajamento</option>
          <option value="custom">Customizado</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="points">Pontos</Label>
        <Input
          id="points"
          type="number"
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
          required
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Criando...' : 'Criar Regra'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Edit Rule Form Component
interface EditRuleFormProps {
  rule: LeadScoringRule;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const EditRuleForm: React.FC<EditRuleFormProps> = ({ rule, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: rule.name,
    description: '',
    points: rule.points,
    isActive: rule.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nome da Regra</Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-points">Pontos</Label>
        <Input
          id="edit-points"
          type="number"
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-active"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="edit-active">Regra Ativa</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default LeadScoringDashboard;

