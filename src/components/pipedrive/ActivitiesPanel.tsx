import { Activity, Deal, Person, Organization, User } from "@/types/pipedrive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Phone,
  Calendar,
  Mail,
  CheckCircle2,
  FileText,
  Clock,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ActivitiesPanelProps {
  activities: Activity[];
  deals: Deal[];
  persons: Person[];
  organizations: Organization[];
  users: User[];
}

export function ActivitiesPanel({
  activities: initialActivities,
  deals,
  persons,
  organizations,
  users,
}: ActivitiesPanelProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: "call",
    status: "open",
    ownerId: users[0]?.id || "",
  });

  const activityIcons = {
    call: Phone,
    meeting: Calendar,
    email: Mail,
    task: CheckCircle2,
    note: FileText,
  };

  const activityColors = {
    call: "bg-blue-100 text-blue-600",
    meeting: "bg-purple-100 text-purple-600",
    email: "bg-green-100 text-green-600",
    task: "bg-amber-100 text-amber-600",
    note: "bg-neutral-100 text-neutral-600",
  };

  const handleCreateActivity = () => {
    const activity: Activity = {
      id: `activity-${Date.now()}`,
      type: newActivity.type || "call",
      subject: newActivity.subject || "",
      note: newActivity.note,
      dealId: newActivity.dealId,
      personId: newActivity.personId,
      organizationId: newActivity.organizationId,
      ownerId: newActivity.ownerId || users[0].id,
      dueDate: newActivity.dueDate,
      dueTime: newActivity.dueTime,
      duration: newActivity.duration,
      status: newActivity.status || "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setActivities([...activities, activity]);
    setIsCreating(false);
    setNewActivity({ type: "call", status: "open", ownerId: users[0]?.id || "" });
  };

  const filteredActivities = activities.filter(activity =>
    activity.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDealTitle = (dealId?: string) => {
    if (!dealId) return undefined;
    return deals.find(d => d.id === dealId)?.title;
  };

  const getPersonName = (personId?: string) => {
    if (!personId) return undefined;
    return persons.find(p => p.id === personId)?.name;
  };

  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return undefined;
    return organizations.find(o => o.id === orgId)?.name;
  };

  const getOwnerName = (ownerId: string) => {
    return users.find(u => u.id === ownerId)?.name || "Desconhecido";
  };

  return (
    <div className="space-y-4">
      <Card className="border-neutral-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-900 text-2xl font-bold">Atividades</CardTitle>
              <CardDescription className="mt-1">Gerencie ligações, reuniões, e-mails e tarefas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar atividades..."
                  className={cn(
                    "pl-9 w-64 bg-white border-neutral-200",
                    "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="border-neutral-200">
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                <p className="font-medium">Nenhuma atividade encontrada</p>
                <p className="text-sm mt-1">Crie uma nova atividade para começar</p>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const Icon = activityIcons[activity.type];
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg",
                      "bg-white border border-neutral-200",
                      "hover:bg-neutral-50 hover:border-primary-300",
                      "transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        activityColors[activity.type]
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{activity.subject}</p>
                        <div className="flex items-center gap-3 text-sm text-neutral-600 mt-1">
                          {getDealTitle(activity.dealId) && (
                            <span>Negócio: {getDealTitle(activity.dealId)}</span>
                          )}
                          {getPersonName(activity.personId) && (
                            <span>• {getPersonName(activity.personId)}</span>
                          )}
                          {getOrganizationName(activity.organizationId) && (
                            <span>• {getOrganizationName(activity.organizationId)}</span>
                          )}
                          {activity.dueDate && (
                            <span>• {format(new Date(activity.dueDate), "dd MMM yyyy", { locale: ptBR })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={activity.status === "done" ? "default" : activity.status === "overdue" ? "destructive" : "secondary"}
                        className={cn(
                          activity.status === "done" && "bg-green-100 text-green-700 border-green-200",
                          activity.status === "overdue" && "bg-red-100 text-red-700 border-red-200",
                          activity.status === "open" && "bg-amber-100 text-amber-700 border-amber-200"
                        )}
                      >
                        {activity.status === "done" ? "Concluída" : activity.status === "overdue" ? "Atrasada" : "Aberta"}
                      </Badge>
                      <span className="text-xs text-neutral-500">{getOwnerName(activity.ownerId)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Activity Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>Crie uma nova atividade para acompanhar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo de Atividade</Label>
              <Select
                value={newActivity.type}
                onValueChange={(v) => setNewActivity({ ...newActivity, type: v as any })}
              >
                <SelectTrigger className="bg-white border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="note">Nota</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                placeholder="Ex: Ligar para cliente sobre proposta"
                value={newActivity.subject || ""}
                onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                className="bg-white border-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Negócio</Label>
                <Select
                  value={newActivity.dealId || ""}
                  onValueChange={(v) => setNewActivity({ ...newActivity, dealId: v || undefined })}
                >
                  <SelectTrigger className="bg-white border-neutral-200">
                    <SelectValue placeholder="Selecione um negócio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {deals.map(deal => (
                      <SelectItem key={deal.id} value={deal.id}>{deal.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={newActivity.ownerId}
                  onValueChange={(v) => setNewActivity({ ...newActivity, ownerId: v })}
                >
                  <SelectTrigger className="bg-white border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newActivity.dueDate ? format(new Date(newActivity.dueDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => setNewActivity({
                    ...newActivity,
                    dueDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="bg-white border-neutral-200"
                />
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={newActivity.dueTime || ""}
                  onChange={(e) => setNewActivity({ ...newActivity, dueTime: e.target.value })}
                  className="bg-white border-neutral-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={newActivity.note || ""}
                onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })}
                className="min-h-[100px] bg-white border-neutral-200"
                placeholder="Adicione notas sobre esta atividade..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreating(false)} className="border-neutral-200">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateActivity}
                className="bg-primary-600 hover:bg-primary-700 text-white"
                disabled={!newActivity.subject}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Atividade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

