/**
 * Template Manager Component
 * Manage campaign message templates
 */

import React, { useState } from 'react';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate
} from '../hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CampaignTemplate } from '../models/types';

export function TemplateManager() {
  const { data: templates, isLoading, error } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables: [] as string[]
  });

  const handleCreate = async () => {
    try {
      if (!formData.name.trim() || !formData.content.trim()) {
        return;
      }
      await createMutation.mutateAsync(formData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;

    try {
      if (!formData.name.trim() || !formData.content.trim()) {
        return;
      }
      await updateMutation.mutateAsync({
        id: editingTemplate.id,
        data: formData
      });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicate = async (template: CampaignTemplate) => {
    setFormData({
      name: `${template.name} (Cópia)`,
      content: template.content,
      variables: template.variables || []
    });
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', content: '', variables: [] });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: CampaignTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      variables: template.variables || []
    });
    setIsDialogOpen(true);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map((m) => m.replace(/[{}]/g, '')) : [];
  };

  React.useEffect(() => {
    if (formData.content) {
      const vars = extractVariables(formData.content);
      setFormData((prev) => ({ ...prev, variables: vars }));
    }
  }, [formData.content]);

  if (isLoading) {
    return <LoadingState message="Carregando templates..." />;
  }

  if (error) {
    return (
      <ErrorState 
        message="Erro ao carregar templates"
        subtitle="Tente novamente em alguns segundos"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Modelos de Mensagem</h3>
          <p className="text-sm text-muted-foreground">
            Crie templates reutilizáveis para suas campanhas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Crie um modelo de mensagem que pode ser reutilizado em múltiplas campanhas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="template-name">Nome do Template *</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Boas-vindas para novos clientes"
                />
              </div>

              <div>
                <Label htmlFor="template-content">Conteúdo da Mensagem *</Label>
                <Textarea
                  id="template-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite sua mensagem aqui. Use {{nome}} para variáveis."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis detectadas:{' '}
                  {formData.variables.length > 0
                    ? formData.variables.map((v) => `{{${v}}}`).join(', ')
                    : 'Nenhuma'}
                </p>
              </div>

              {formData.variables.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Variáveis encontradas:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable) => (
                      <Badge key={variable} variant="outline">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm whitespace-pre-wrap">
                    {formData.content || 'Sua mensagem aparecerá aqui...'}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={editingTemplate ? handleUpdate : handleCreate}
                disabled={!formData.name.trim() || !formData.content.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingTemplate ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      {!templates || templates.length === 0 ? (
        <EmptyState
          title="Nenhum template criado"
          description="Crie seu primeiro template para facilitar a criação de campanhas"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(template)}
                      title="Duplicar template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(template)}
                      title="Editar template"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(template.id)}
                      title="Deletar template"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-sm whitespace-pre-wrap">{template.content}</p>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Variáveis:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Criado em: {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este template? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
