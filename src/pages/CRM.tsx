import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Zap,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Send
} from "lucide-react";
import { useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: "lead" | "contacted" | "interested" | "customer" | "inactive";
  lastContact?: string;
  tags: string[];
  notes?: string;
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  executionCount: number;
}

// Contacts will be loaded from backend /crm/contacts

const mockAutomations: Automation[] = [
  { id: "1", name: "Boas-vindas Novo Lead", trigger: "Novo contato adicionado", action: "Enviar mensagem de boas-vindas", isActive: true, executionCount: 156 },
  { id: "2", name: "Follow-up 24h", trigger: "24h sem resposta", action: "Enviar lembrete", isActive: true, executionCount: 89 },
  { id: "3", name: "Oferta Especial VIP", trigger: "Tag VIP adicionada", action: "Enviar cupom exclusivo", isActive: false, executionCount: 34 },
  { id: "4", name: "Reativação", trigger: "30 dias inativo", action: "Enviar mensagem de reativação", isActive: true, executionCount: 45 },
];

const statusConfig = {
  lead: { label: "Lead", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contacted: { label: "Contatado", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  interested: { label: "Interessado", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  customer: { label: "Cliente", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  inactive: { label: "Inativo", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("contacts");

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ));
  };

  // Buscar contatos reais do backend
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('http://localhost:3001/crm/contacts');
      if (!resp.ok) throw new Error('Erro ao buscar contatos');
      const data = await resp.json();
      setContacts(data);
    } catch (e) {
      console.error('Erro ao buscar contatos:', e);
      alert('Erro ao buscar contatos do servidor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Enviar mensagem real via backend -> Baileys
  const handleSendMessage = async (phone: string) => {
    const message = window.prompt('Digite a mensagem para este contato:');
    if (!message) return;
    try {
      const res = await fetch('http://localhost:3001/crm/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
      });
      if (res.ok) {
        alert('Mensagem enviada com sucesso!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Erro ao enviar: ' + (err.error || res.statusText));
      }
    } catch (e) {
      console.error('Falha ao enviar mensagem:', e);
      alert('Falha na conexão com o servidor.');
    }
  };

  const stats = {
    total: contacts.length,
    leads: contacts.filter(c => c.status === "lead").length,
    customers: contacts.filter(c => c.status === "customer").length,
    activeAutomations: automations.filter(a => a.isActive).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Contatos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.leads}</p>
                  <p className="text-xs text-muted-foreground">Novos Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.customers}</p>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.activeAutomations}</p>
                  <p className="text-xs text-muted-foreground">Automações Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border/50">
            <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="automations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4 mr-2" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-foreground">Gerenciar Contatos</CardTitle>
                    <CardDescription>Gerencie seus leads e clientes</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar contato..." 
                        className="pl-9 w-64 bg-secondary/50 border-border/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="whatsapp">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredContacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex gap-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Badge className={statusConfig[contact.status].color}>
                          {statusConfig[contact.status].label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {contact.lastContact}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendMessage(contact.phone)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Automações</CardTitle>
                    <CardDescription>Configure fluxos automáticos de mensagens</CardDescription>
                  </div>
                  <Button variant="whatsapp">
                    <Zap className="h-4 w-4 mr-2" />
                    Nova Automação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automations.map((automation) => (
                    <div 
                      key={automation.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${automation.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                          <Zap className={`h-5 w-5 ${automation.isActive ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{automation.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {automation.trigger}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {automation.action}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{automation.executionCount}</p>
                          <p className="text-xs text-muted-foreground">execuções</p>
                        </div>
                        <Button 
                          variant={automation.isActive ? "success" : "outline"}
                          size="sm"
                          onClick={() => toggleAutomation(automation.id)}
                        >
                          {automation.isActive ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Templates de Mensagens</CardTitle>
                <CardDescription>Crie e gerencie templates para suas automações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-foreground">Boas-vindas</h4>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Olá! 👋 Seja bem-vindo ao nosso grupo exclusivo de ofertas...
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm">Testar</Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-foreground">Follow-up</h4>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Oi! Vi que você ainda não respondeu. Posso ajudar com algo?...
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Editar</Button>
                      <Button variant="ghost" size="sm">Testar</Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30 border-dashed flex items-center justify-center">
                    <Button variant="ghost" className="text-muted-foreground">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Adicionar Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
