import { Deal, Pipeline, User, Person, Organization, Activity } from "@/types/pipedrive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  DollarSign,
  Calendar,
  User as UserIcon,
  Building2,
  Tag,
  FileText,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity as ActivityIcon,
  Plus,
  Phone,
  Mail,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DealDetailsProps {
  deal: Deal;
  pipeline: Pipeline;
  users: User[];
  persons: Person[];
  organizations: Organization[];
  activities: Activity[];
  onClose: () => void;
  onUpdate: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
  onCreateActivity?: (activity: Activity) => void;
}

export function DealDetails({
  deal,
  pipeline,
  users,
  persons,
  organizations,
  activities,
  onClose,
  onUpdate,
  onDelete,
  onCreateActivity,
}: DealDetailsProps) {
  const [editedDeal, setEditedDeal] = useState<Deal>(deal);
  const [isSaving, setIsSaving] = useState(false);

  const currentStage = pipeline.stages.find(s => s.id === editedDeal.stageId);
  const owner = users.find(u => u.id === editedDeal.ownerId);
  const person = persons.find(p => p.id === editedDeal.personId);
  const organization = organizations.find(o => o.id === editedDeal.organizationId);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdate({ ...editedDeal, updatedAt: new Date() });
      setIsSaving(false);
    }, 500);
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este negócio?")) {
      onDelete(deal.id);
      onClose();
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-neutral-900">
              {editedDeal.title}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            Gerencie os detalhes do negócio
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={editedDeal.status === "won" ? "default" : editedDeal.status === "lost" ? "destructive" : "secondary"}
              className={cn(
                "text-sm px-3 py-1",
                editedDeal.status === "won" && "bg-green-100 text-green-700 border-green-200",
                editedDeal.status === "lost" && "bg-red-100 text-red-700 border-red-200",
                editedDeal.status === "open" && "bg-blue-100 text-blue-700 border-blue-200"
              )}
            >
              {editedDeal.status === "won" ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ganho
                </>
              ) : editedDeal.status === "lost" ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Perdido
                </>
              ) : (
                "Aberto"
              )}
            </Badge>
            {currentStage && (
              <Badge variant="outline" className="text-sm" style={{ borderColor: currentStage.color }}>
                <div
                  className="h-2 w-2 rounded-full mr-2"
                  style={{ backgroundColor: currentStage.color }}
                />
                {currentStage.name}
              </Badge>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-neutral-900">Título do Negócio</Label>
              <Input
                value={editedDeal.title}
                onChange={(e) => setEditedDeal({ ...editedDeal, title: e.target.value })}
                className="bg-white border-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Valor</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editedDeal.value}
                    onChange={(e) => setEditedDeal({ ...editedDeal, value: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-neutral-200"
                  />
                  <Select
                    value={editedDeal.currency}
                    onValueChange={(v) => setEditedDeal({ ...editedDeal, currency: v as any })}
                  >
                    <SelectTrigger className="w-24 bg-white border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Probabilidade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editedDeal.probability || currentStage?.probability || 0}
                  onChange={(e) => setEditedDeal({ ...editedDeal, probability: parseInt(e.target.value) || 0 })}
                  className="bg-white border-neutral-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-neutral-900">Etapa do Funil</Label>
              <Select
                value={editedDeal.stageId}
                onValueChange={(v) => setEditedDeal({ ...editedDeal, stageId: v })}
              >
                <SelectTrigger className="bg-white border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipeline.stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name} ({stage.probability}%)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Responsável</Label>
                <Select
                  value={editedDeal.ownerId}
                  onValueChange={(v) => setEditedDeal({ ...editedDeal, ownerId: v })}
                >
                  <SelectTrigger className="bg-white border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Data Prevista de Fechamento</Label>
                <Input
                  type="date"
                  value={editedDeal.expectedCloseDate ? format(new Date(editedDeal.expectedCloseDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => setEditedDeal({
                    ...editedDeal,
                    expectedCloseDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="bg-white border-neutral-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Pessoa de Contato</Label>
                <Select
                  value={editedDeal.personId || ""}
                  onValueChange={(v) => setEditedDeal({ ...editedDeal, personId: v || undefined })}
                >
                  <SelectTrigger className="bg-white border-neutral-200">
                    <SelectValue placeholder="Selecione uma pessoa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {persons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-neutral-900">Empresa</Label>
                <Select
                  value={editedDeal.organizationId || ""}
                  onValueChange={(v) => setEditedDeal({ ...editedDeal, organizationId: v || undefined })}
                >
                  <SelectTrigger className="bg-white border-neutral-200">
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-neutral-900">Status</Label>
              <Select
                value={editedDeal.status}
                onValueChange={(v) => setEditedDeal({ ...editedDeal, status: v as any })}
              >
                <SelectTrigger className="bg-white border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-neutral-900">Notas</Label>
              <Textarea
                value={editedDeal.notes || ""}
                onChange={(e) => setEditedDeal({ ...editedDeal, notes: e.target.value })}
                className="min-h-[120px] bg-white border-neutral-200"
                placeholder="Adicione notas sobre este negócio..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-neutral-200">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Timeline & Activities Section */}
          <div className="space-y-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Timeline e Atividades</h3>
              {onCreateActivity && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Open activity creation dialog
                    const newActivity: Activity = {
                      id: `activity-${Date.now()}`,
                      type: "task",
                      subject: "Nova atividade",
                      dealId: deal.id,
                      ownerId: users[0]?.id || "",
                      status: "open",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };
                    onCreateActivity(newActivity);
                  }}
                  className="border-neutral-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </Button>
              )}
            </div>

            {/* Timeline Events */}
            {deal.timeline && deal.timeline.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-700">Histórico</h4>
                <div className="space-y-2">
                  {deal.timeline
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((event) => {
                      const user = users.find(u => u.id === event.userId);
                      return (
                        <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-primary-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900">{event.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-neutral-600">
                                {format(new Date(event.timestamp), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              {user && (
                                <>
                                  <span className="text-xs text-neutral-400">•</span>
                                  <span className="text-xs text-neutral-600">{user.name}</span>
                                </>
                              )}
                            </div>
                            {event.metadata && (
                              <div className="mt-2 text-xs text-neutral-600">
                                {event.metadata.oldValue !== undefined && event.metadata.newValue !== undefined && (
                                  <span>
                                    {event.metadata.oldValue} → {event.metadata.newValue}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Activities */}
            {activities.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-700">Atividades</h4>
                <div className="space-y-2">
                  {activities
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((activity) => {
                      const owner = users.find(u => u.id === activity.ownerId);
                      const activityIcons = {
                        call: Phone,
                        meeting: Calendar,
                        email: Mail,
                        task: CheckCircle,
                        note: FileText,
                      };
                      const Icon = activityIcons[activity.type] || ActivityIcon;
                      const activityColors = {
                        call: "bg-blue-100 text-blue-600",
                        meeting: "bg-purple-100 text-purple-600",
                        email: "bg-green-100 text-green-600",
                        task: "bg-amber-100 text-amber-600",
                        note: "bg-neutral-100 text-neutral-600",
                      };

                      return (
                        <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-white border border-neutral-200">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", activityColors[activity.type])}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-neutral-900">{activity.subject}</p>
                              <Badge
                                variant={activity.status === "done" ? "default" : activity.status === "overdue" ? "destructive" : "secondary"}
                                className={cn(
                                  "text-xs",
                                  activity.status === "done" && "bg-green-100 text-green-700 border-green-200",
                                  activity.status === "overdue" && "bg-red-100 text-red-700 border-red-200",
                                  activity.status === "open" && "bg-amber-100 text-amber-700 border-amber-200"
                                )}
                              >
                                {activity.status === "done" ? "Concluída" : activity.status === "overdue" ? "Atrasada" : "Aberta"}
                              </Badge>
                            </div>
                            {activity.note && (
                              <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{activity.note}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                              {activity.dueDate && (
                                <span>
                                  {format(new Date(activity.dueDate), "dd MMM yyyy", { locale: ptBR })}
                                </span>
                              )}
                              {owner && (
                                <>
                                  <span>•</span>
                                  <span>{owner.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {(!deal.timeline || deal.timeline.length === 0) && activities.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <ActivityIcon className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
                <p className="text-sm font-medium">Nenhuma atividade ou evento</p>
                <p className="text-xs mt-1">Crie atividades para acompanhar este negócio</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

