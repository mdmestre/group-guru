import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  Play,
  Pause,
  Filter,
} from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import {
  useSegments,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useSegmentMembers,
  useRefreshSegmentMembers,
  useEvaluateSegment,
} from '../hooks/useSegments';
import { Segment, SegmentRule, SegmentOperator } from '../models/segments';

export const SegmentBuilder: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);

  const { data: segments, isLoading, error, refetch } = useSegments();
  const { data: membersData, isLoading: membersLoading } = useSegmentMembers(
    selectedSegment?.id || '',
    1
  );
  const refreshMembers = useRefreshSegmentMembers();

  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment(selectedSegment?.id || '');
  const deleteSegment = useDeleteSegment();
  const evaluateSegment = useEvaluateSegment();

  if (isLoading) {
    return <LoadingState message="Carregando segmentos..." fullHeight={true} />;
  }
  
  if (error) {
    return (
      <ErrorState
        message="Erro ao carregar segmentos"
        onRetry={() => refetch()}
        fullHeight={true}
      />
    );
  }

  // Ensure segments is an array before filtering
  const segmentsArray = Array.isArray(segments) ? segments : [];
  const activeSegments = segmentsArray.filter(s => s.isActive);
  const inactiveSegments = segmentsArray.filter(s => !s.isActive);

  const handleRefreshMembers = (segmentId: string) => {
    refreshMembers.mutate(segmentId, {
      onSuccess: () => {
        // Show success toast
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Segmentos</h2>
          <p className="text-neutral-600 mt-1">Crie e gerencie segmentos de contatos para campanhas e automações</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Segmento</DialogTitle>
              <DialogDescription>
                Defina critérios para segmentar seus contatos automaticamente
              </DialogDescription>
            </DialogHeader>
            <CreateSegmentForm
              onSubmit={(data) => {
                createSegment.mutate(data, {
                  onSuccess: () => {
                    setIsCreateDialogOpen(false);
                    refetch();
                  },
                  onError: (error: any) => {
                    console.error('Erro ao criar segmento:', error);
                    alert(error.message || 'Erro ao criar segmento');
                  },
                });
              }}
              isLoading={createSegment.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{segments?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total de Segmentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{activeSegments.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Segmentos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gray-100">
                <Pause className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{inactiveSegments.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Segmentos Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">
                  {segments?.reduce((sum, s) => sum + s.memberCount, 0) || 0}
                </p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total de Membros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Segmentos</CardTitle>
          <CardDescription>Lista completa de segmentos criados</CardDescription>
        </CardHeader>
        <CardContent>
          {!segments?.length ? (
            <EmptyState
              title="Nenhum segmento criado"
              description="Crie seu primeiro segmento para começar a segmentar seus contatos"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell className="text-neutral-600">
                      {segment.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{segment.memberCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {segment.isSmart ? (
                        <Badge className="bg-purple-100 text-purple-700">Inteligente</Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {segment.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSegment(segment);
                            setIsMembersDialogOpen(true);
                          }}
                          title="Ver Membros"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRefreshMembers(segment.id)}
                          title="Atualizar Membros"
                          disabled={refreshMembers.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshMembers.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSegment(segment);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja deletar este segmento?')) {
                              deleteSegment.mutate(segment.id, {
                                onSuccess: () => refetch(),
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

      {/* Edit Dialog */}
      {selectedSegment && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Segmento</DialogTitle>
              <DialogDescription>
                Atualize as configurações do segmento
              </DialogDescription>
            </DialogHeader>
            <EditSegmentForm
              segment={selectedSegment}
              onSubmit={(data) => {
                updateSegment.mutate(data, {
                  onSuccess: () => {
                    setIsEditDialogOpen(false);
                    setSelectedSegment(null);
                    refetch();
                  },
                });
              }}
              isLoading={updateSegment.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Members Dialog */}
      {selectedSegment && (
        <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Membros do Segmento: {selectedSegment.name}</DialogTitle>
              <DialogDescription>
                Lista de contatos que fazem parte deste segmento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {membersLoading ? (
                <LoadingState message="Carregando membros..." />
              ) : !membersData?.members.length ? (
                <EmptyState
                  title="Nenhum membro encontrado"
                  description="Este segmento ainda não possui membros"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Adicionado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersData.members.map((member) => (
                      <TableRow key={member.contactId}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email || '-'}</TableCell>
                        <TableCell>{member.phone || '-'}</TableCell>
                        <TableCell>
                          {new Date(member.addedAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Create Segment Form
interface CreateSegmentFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const CreateSegmentForm: React.FC<CreateSegmentFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    filterLogic: 'AND' as 'AND' | 'OR',
    criteria: {
      rules: [] as SegmentRule[],
    },
  });

  const [newRule, setNewRule] = useState<Partial<SegmentRule>>({
    field: '',
    operator: 'equals' as SegmentOperator,
    value: '',
  });

  const handleAddRule = () => {
    if (newRule.field && newRule.operator && newRule.value) {
      setFormData({
        ...formData,
        criteria: {
          rules: [...formData.criteria.rules, newRule as SegmentRule],
        },
      });
      setNewRule({ field: '', operator: 'equals', value: '' });
    }
  };

  const handleRemoveRule = (index: number) => {
    setFormData({
      ...formData,
      criteria: {
        rules: formData.criteria.rules.filter((_, i) => i !== index),
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Nome do segmento é obrigatório');
      return;
    }
    
    if (formData.criteria.rules.length === 0) {
      alert('Adicione pelo menos uma regra ao segmento');
      return;
    }
    
    onSubmit({
      name: formData.name,
      description: formData.description,
      criteria: formData.criteria,
      filterLogic: formData.filterLogic,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Segmento</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filterLogic">Lógica de Filtro</Label>
        <Select
          value={formData.filterLogic}
          onValueChange={(value) => setFormData({ ...formData, filterLogic: value as 'AND' | 'OR' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">E (AND) - Todas as condições</SelectItem>
            <SelectItem value="OR">OU (OR) - Qualquer condição</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 border-t pt-4">
        <Label>Regras do Segmento</Label>
        
        {/* Existing Rules */}
        {formData.criteria.rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <span className="text-sm font-medium">{rule.field}</span>
              <span className="text-sm text-neutral-600">{rule.operator}</span>
              <span className="text-sm text-neutral-600">{String(rule.value)}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveRule(index)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ))}

        {/* Add New Rule */}
        <div className="space-y-2 p-4 border-2 border-dashed rounded-lg">
          <Label>Adicionar Nova Regra</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Campo (ex: email, phone, tags)"
              value={newRule.field || ''}
              onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
            />
            <Select
              value={newRule.operator}
              onValueChange={(value) => setNewRule({ ...newRule, operator: value as SegmentOperator })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Igual a</SelectItem>
                <SelectItem value="notEquals">Diferente de</SelectItem>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="notContains">Não contém</SelectItem>
                <SelectItem value="greaterThan">Maior que</SelectItem>
                <SelectItem value="lessThan">Menor que</SelectItem>
                <SelectItem value="isEmpty">Está vazio</SelectItem>
                <SelectItem value="isNotEmpty">Não está vazio</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Valor"
                value={newRule.value || ''}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                disabled={newRule.operator === 'isEmpty' || newRule.operator === 'isNotEmpty'}
              />
              <Button type="button" onClick={handleAddRule} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading || formData.criteria.rules.length === 0}>
          {isLoading ? 'Criando...' : 'Criar Segmento'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Edit Segment Form
interface EditSegmentFormProps {
  segment: Segment;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const EditSegmentForm: React.FC<EditSegmentFormProps> = ({ segment, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: segment.name,
    description: segment.description || '',
    isActive: segment.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nome do Segmento</Label>
        <Input
          id="edit-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Descrição</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
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
        <Label htmlFor="edit-active">Segmento Ativo</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default SegmentBuilder;

