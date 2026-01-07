import { Person, Organization, Deal } from "@/types/pipedrive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  User,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PersonsPanelProps {
  persons: Person[];
  onUpdatePersons: (persons: Person[]) => void;
  organizations: Organization[];
  deals: Deal[];
}

export function PersonsPanel({
  persons,
  onUpdatePersons,
  organizations,
  deals,
}: PersonsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [newPerson, setNewPerson] = useState<Partial<Person>>({
    name: "",
    email: "",
    phone: "",
  });

  const handleCreatePerson = () => {
    const person: Person = {
      id: `person-${Date.now()}`,
      name: newPerson.name || "",
      email: newPerson.email,
      phone: newPerson.phone,
      organizationId: newPerson.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onUpdatePersons([...persons, person]);
    setIsCreating(false);
    setNewPerson({ name: "", email: "", phone: "" });
  };

  const handleUpdatePerson = (updatedPerson: Person) => {
    onUpdatePersons(persons.map(p => p.id === updatedPerson.id ? updatedPerson : p));
    setSelectedPerson(null);
  };

  const handleDeletePerson = (personId: string) => {
    if (confirm("Tem certeza que deseja excluir esta pessoa?")) {
      onUpdatePersons(persons.filter(p => p.id !== personId));
    }
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phone?.includes(searchTerm)
  );

  const getPersonDeals = (personId: string) => {
    return deals.filter(d => d.personId === personId);
  };

  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return undefined;
    return organizations.find(o => o.id === orgId)?.name;
  };

  return (
    <div className="space-y-4">
      <Card className="border-neutral-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-900 text-2xl font-bold">Pessoas</CardTitle>
              <CardDescription className="mt-1">Gerencie seus contatos e leads</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar pessoas..."
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
                Nova Pessoa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPersons.map((person) => {
              const personDeals = getPersonDeals(person.id);
              return (
                <div
                  key={person.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    "bg-white border border-neutral-200",
                    "hover:bg-neutral-50 hover:border-primary-300",
                    "transition-colors cursor-pointer"
                  )}
                  onClick={() => setSelectedPerson(person)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-600">
                        {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{person.name}</p>
                      <div className="flex items-center gap-3 text-sm text-neutral-600 mt-1">
                        {person.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{person.email}</span>
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{person.phone}</span>
                          </div>
                        )}
                        {getOrganizationName(person.organizationId) && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{getOrganizationName(person.organizationId)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-neutral-200">
                      {personDeals.length} negócios
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePerson(person.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Person Dialog */}
      <Dialog open={isCreating || selectedPerson !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setSelectedPerson(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPerson ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle>
            <DialogDescription>
              {selectedPerson ? "Edite os dados da pessoa" : "Adicione uma nova pessoa ao CRM"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={selectedPerson?.name || newPerson.name || ""}
                onChange={(e) => {
                  if (selectedPerson) {
                    setSelectedPerson({ ...selectedPerson, name: e.target.value });
                  } else {
                    setNewPerson({ ...newPerson, name: e.target.value });
                  }
                }}
                className="bg-white border-neutral-200"
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={selectedPerson?.email || newPerson.email || ""}
                  onChange={(e) => {
                    if (selectedPerson) {
                      setSelectedPerson({ ...selectedPerson, email: e.target.value });
                    } else {
                      setNewPerson({ ...newPerson, email: e.target.value });
                    }
                  }}
                  className="bg-white border-neutral-200"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={selectedPerson?.phone || newPerson.phone || ""}
                  onChange={(e) => {
                    if (selectedPerson) {
                      setSelectedPerson({ ...selectedPerson, phone: e.target.value });
                    } else {
                      setNewPerson({ ...newPerson, phone: e.target.value });
                    }
                  }}
                  className="bg-white border-neutral-200"
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={selectedPerson?.organizationId || newPerson.organizationId || ""}
                onValueChange={(v) => {
                  if (selectedPerson) {
                    setSelectedPerson({ ...selectedPerson, organizationId: v || undefined });
                  } else {
                    setNewPerson({ ...newPerson, organizationId: v || undefined });
                  }
                }}
              >
                <SelectTrigger className="bg-white border-neutral-200">
                  <SelectValue placeholder="Nenhuma empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma empresa</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedPerson(null);
                }}
                className="border-neutral-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedPerson) {
                    handleUpdatePerson(selectedPerson);
                  } else {
                    handleCreatePerson();
                  }
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white"
                disabled={!selectedPerson?.name && !newPerson.name}
              >
                {selectedPerson ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

