import { Organization, Person, Deal } from "@/types/pipedrive";
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
  Globe,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrganizationsPanelProps {
  organizations: Organization[];
  onUpdateOrganizations: (orgs: Organization[]) => void;
  persons: Person[];
  deals: Deal[];
}

export function OrganizationsPanel({
  organizations,
  onUpdateOrganizations,
  persons,
  deals,
}: OrganizationsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [newOrg, setNewOrg] = useState<Partial<Organization>>({
    name: "",
    email: "",
    phone: "",
  });

  const handleCreateOrganization = () => {
    const org: Organization = {
      id: `org-${Date.now()}`,
      name: newOrg.name || "",
      email: newOrg.email,
      phone: newOrg.phone,
      website: newOrg.website,
      address: newOrg.address,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onUpdateOrganizations([...organizations, org]);
    setIsCreating(false);
    setNewOrg({ name: "", email: "", phone: "" });
  };

  const handleUpdateOrganization = (updatedOrg: Organization) => {
    onUpdateOrganizations(organizations.map(o => o.id === updatedOrg.id ? updatedOrg : o));
    setSelectedOrg(null);
  };

  const handleDeleteOrganization = (orgId: string) => {
    if (confirm("Tem certeza que deseja excluir esta empresa?")) {
      onUpdateOrganizations(organizations.filter(o => o.id !== orgId));
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.phone?.includes(searchTerm)
  );

  const getOrgPersons = (orgId: string) => {
    return persons.filter(p => p.organizationId === orgId);
  };

  const getOrgDeals = (orgId: string) => {
    return deals.filter(d => d.organizationId === orgId);
  };

  return (
    <div className="space-y-4">
      <Card className="border-neutral-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-900 text-2xl font-bold">Empresas</CardTitle>
              <CardDescription className="mt-1">Gerencie organizações e empresas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar empresas..."
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
                Nova Empresa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrganizations.map((org) => {
              const orgPersons = getOrgPersons(org.id);
              const orgDeals = getOrgDeals(org.id);
              return (
                <div
                  key={org.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    "bg-white border border-neutral-200",
                    "hover:bg-neutral-50 hover:border-primary-300",
                    "transition-colors cursor-pointer"
                  )}
                  onClick={() => setSelectedOrg(org)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{org.name}</p>
                      <div className="flex items-center gap-3 text-sm text-neutral-600 mt-1">
                        {org.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{org.email}</span>
                          </div>
                        )}
                        {org.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{org.phone}</span>
                          </div>
                        )}
                        {org.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            <span>{org.website}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="border-neutral-200">
                        {orgPersons.length} pessoas
                      </Badge>
                      <Badge variant="outline" className="border-neutral-200">
                        {orgDeals.length} negócios
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrganization(org.id);
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

      {/* Create/Edit Organization Dialog */}
      <Dialog open={isCreating || selectedOrg !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setSelectedOrg(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedOrg ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            <DialogDescription>
              {selectedOrg ? "Edite os dados da empresa" : "Adicione uma nova empresa ao CRM"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={selectedOrg?.name || newOrg.name || ""}
                onChange={(e) => {
                  if (selectedOrg) {
                    setSelectedOrg({ ...selectedOrg, name: e.target.value });
                  } else {
                    setNewOrg({ ...newOrg, name: e.target.value });
                  }
                }}
                className="bg-white border-neutral-200"
                placeholder="Nome da empresa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={selectedOrg?.email || newOrg.email || ""}
                  onChange={(e) => {
                    if (selectedOrg) {
                      setSelectedOrg({ ...selectedOrg, email: e.target.value });
                    } else {
                      setNewOrg({ ...newOrg, email: e.target.value });
                    }
                  }}
                  className="bg-white border-neutral-200"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={selectedOrg?.phone || newOrg.phone || ""}
                  onChange={(e) => {
                    if (selectedOrg) {
                      setSelectedOrg({ ...selectedOrg, phone: e.target.value });
                    } else {
                      setNewOrg({ ...newOrg, phone: e.target.value });
                    }
                  }}
                  className="bg-white border-neutral-200"
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={selectedOrg?.website || newOrg.website || ""}
                onChange={(e) => {
                  if (selectedOrg) {
                    setSelectedOrg({ ...selectedOrg, website: e.target.value });
                  } else {
                    setNewOrg({ ...newOrg, website: e.target.value });
                  }
                }}
                className="bg-white border-neutral-200"
                placeholder="https://empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={selectedOrg?.address || newOrg.address || ""}
                onChange={(e) => {
                  if (selectedOrg) {
                    setSelectedOrg({ ...selectedOrg, address: e.target.value });
                  } else {
                    setNewOrg({ ...newOrg, address: e.target.value });
                  }
                }}
                className="bg-white border-neutral-200"
                placeholder="Endereço completo"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedOrg(null);
                }}
                className="border-neutral-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrg) {
                    handleUpdateOrganization(selectedOrg);
                  } else {
                    handleCreateOrganization();
                  }
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white"
                disabled={!selectedOrg?.name && !newOrg.name}
              >
                {selectedOrg ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

