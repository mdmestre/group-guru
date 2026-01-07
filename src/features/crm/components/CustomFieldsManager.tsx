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
  Settings,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
} from '../hooks/useCustomFields';
import { CustomField, CustomFieldType } from '../models/custom-fields';

export const CustomFieldsManager: React.FC = () => {
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: fields, isLoading, error, refetch } = useCustomFields();

  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField(selectedField?.id || '');
  const deleteField = useDeleteCustomField();

  if (isLoading) {
    return <LoadingState message="Carregando campos customizados..." fullHeight={true} />;
  }
  
  if (error) {
    return (
      <ErrorState
        message="Erro ao carregar campos customizados"
        onRetry={() => refetch()}
        fullHeight={true}
      />
    );
  }

  // Ensure fields is an array before filtering
  const fieldsArray = Array.isArray(fields) ? fields : [];
  const activeFields = fieldsArray.filter(f => f.isActive);
  const inactiveFields = fieldsArray.filter(f => !f.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Campos Customizados</h2>
          <p className="text-neutral-600 mt-1">Gerencie campos personalizados para contatos, empresas e negócios</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Campo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Campo Customizado</DialogTitle>
              <DialogDescription>
                Adicione um novo campo personalizado para capturar informações específicas
              </DialogDescription>
            </DialogHeader>
            <CreateFieldForm
              onSubmit={(data) => {
                createField.mutate(data, {
                  onSuccess: () => {
                    setIsCreateDialogOpen(false);
                    refetch();
                  },
                  onError: (error: any) => {
                    console.error('Erro ao criar campo:', error);
                    alert(error.message || 'Erro ao criar campo customizado');
                  },
                });
              }}
              isLoading={createField.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{fields?.length || 0}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total de Campos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{activeFields.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Campos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900">{inactiveFields.length}</p>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Campos Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Campos</CardTitle>
          <CardDescription>Lista completa de campos customizados</CardDescription>
        </CardHeader>
        <CardContent>
          {!fields?.length ? (
            <EmptyState
              title="Nenhum campo customizado"
              description="Crie seu primeiro campo customizado para começar"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{field.fieldType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{field.entityType}</Badge>
                    </TableCell>
                    <TableCell>
                      {field.isRequired ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {field.isActive ? (
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
                            setSelectedField(field);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja deletar este campo?')) {
                              deleteField.mutate(field.id, {
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
      {selectedField && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Campo Customizado</DialogTitle>
              <DialogDescription>
                Atualize as configurações do campo
              </DialogDescription>
            </DialogHeader>
            <EditFieldForm
              field={selectedField}
              onSubmit={(data) => {
                updateField.mutate(data, {
                  onSuccess: () => {
                    setIsEditDialogOpen(false);
                    setSelectedField(null);
                    refetch();
                  },
                });
              }}
              isLoading={updateField.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Create Field Form
interface CreateFieldFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const CreateFieldForm: React.FC<CreateFieldFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    fieldType: 'text' as CustomFieldType,
    entityType: 'contact' as 'contact' | 'company' | 'deal',
    description: '',
    isRequired: false,
    isUnique: false,
    defaultValue: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name && !formData.label) {
      alert('Nome ou Rótulo é obrigatório');
      return;
    }
    
    if (!formData.fieldType) {
      alert('Tipo de campo é obrigatório');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome (ID)</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ex: company_size"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Rótulo</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="ex: Tamanho da Empresa"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fieldType">Tipo de Campo</Label>
          <Select
            value={formData.fieldType}
            onValueChange={(value) => setFormData({ ...formData, fieldType: value as CustomFieldType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="select">Seleção</SelectItem>
              <SelectItem value="multiselect">Múltipla Seleção</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="textarea">Área de Texto</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="currency">Moeda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entityType">Entidade</Label>
          <Select
            value={formData.entityType}
            onValueChange={(value) => setFormData({ ...formData, entityType: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contact">Contato</SelectItem>
              <SelectItem value="company">Empresa</SelectItem>
              <SelectItem value="deal">Negócio</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <Label htmlFor="defaultValue">Valor Padrão (opcional)</Label>
        <Input
          id="defaultValue"
          value={formData.defaultValue}
          onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isRequired"
            checked={formData.isRequired}
            onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="isRequired">Campo Obrigatório</Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isUnique"
            checked={formData.isUnique}
            onChange={(e) => setFormData({ ...formData, isUnique: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="isUnique">Valor Único</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Criando...' : 'Criar Campo'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Edit Field Form
interface EditFieldFormProps {
  field: CustomField;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const EditFieldForm: React.FC<EditFieldFormProps> = ({ field, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    label: field.label,
    description: field.description || '',
    isRequired: field.isRequired,
    isActive: field.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-label">Rótulo</Label>
        <Input
          id="edit-label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
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

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-required"
            checked={formData.isRequired}
            onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="edit-required">Campo Obrigatório</Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-active"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="edit-active">Campo Ativo</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default CustomFieldsManager;

