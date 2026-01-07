/**
 * Channel Settings Component
 * Configure connections for all channels
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Mail,
  Send,
  Phone,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';

interface ChannelConnection {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  icon: React.ReactNode;
}

export function ChannelSettings() {
  const [connections, setConnections] = useState<Record<string, ChannelConnection[]>>({
    whatsapp: [
      {
        id: '1',
        name: 'Número Principal',
        status: 'connected',
        createdAt: '2024-01-01',
        icon: <MessageCircle className="h-5 w-5" />
      }
    ],
    email: [],
    telegram: [],
    sms: [
      {
        id: '1',
        name: 'Twilio Account',
        status: 'connected',
        createdAt: '2024-01-05',
        icon: <Phone className="h-5 w-5" />
      }
    ]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Telegram</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conexões WhatsApp</CardTitle>
              <CardDescription>
                Gerencie suas conexões WhatsApp Business
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {connections.whatsapp.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50">{conn.icon}</div>
                    <div>
                      <h4 className="font-semibold">{conn.name}</h4>
                      <p className="text-sm text-neutral-600">Conectado em {conn.createdAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(conn.status)}>
                      {getStatusIcon(conn.status)}
                      <span className="ml-1">Conectado</span>
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conexão WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conexões Email</CardTitle>
              <CardDescription>
                Configure serviços de email para disparos em massa
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {connections.email.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4">Nenhuma conexão de email configurada</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar Email
                  </Button>
                </div>
              ) : (
                connections.email.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50">{conn.icon}</div>
                      <div>
                        <h4 className="font-semibold">{conn.name}</h4>
                        <p className="text-sm text-neutral-600">Conectado em {conn.createdAt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(conn.status)}>
                        {getStatusIcon(conn.status)}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Email Setup Guide */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Como conectar Email?</h3>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="font-semibold">SMTP Host</Label>
                  <Input placeholder="smtp.gmail.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Porta</Label>
                    <Input placeholder="587" />
                  </div>
                  <div>
                    <Label className="font-semibold">Segurança</Label>
                    <Input placeholder="TLS" />
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Usuário</Label>
                  <Input placeholder="seu@email.com" />
                </div>
                <div>
                  <Label className="font-semibold">Senha</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>

              <Button className="w-full">Testar Conexão</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telegram Settings */}
        <TabsContent value="telegram" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conexões Telegram</CardTitle>
              <CardDescription>
                Configure bots Telegram para disparos
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {connections.telegram.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4">Nenhum bot Telegram conectado</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar Bot Telegram
                  </Button>
                </div>
              ) : null}

              {/* Bot Token Form */}
              <div className="p-4 border rounded-lg space-y-4">
                <div>
                  <Label className="font-semibold">Token do Bot</Label>
                  <Input placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
                  <p className="text-xs text-neutral-600 mt-2">
                    Obtenha seu token falando com @BotFather no Telegram
                  </p>
                </div>

                <div>
                  <Label className="font-semibold">Nome do Bot</Label>
                  <Input placeholder="Meu Bot de Notificações" />
                </div>

                <Button className="w-full">Conectar Bot</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conexões SMS</CardTitle>
              <CardDescription>
                Configure provedores SMS para disparos
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {connections.sms.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50">{conn.icon}</div>
                    <div>
                      <h4 className="font-semibold">{conn.name}</h4>
                      <p className="text-sm text-neutral-600">Saldo: $5.32</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(conn.status)}>
                      {getStatusIcon(conn.status)}
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conexão SMS
              </Button>
            </CardContent>
          </Card>

          {/* SMS Recharge */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <h3 className="font-semibold">Recarregar Saldo SMS</h3>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {['$10', '$25', '$50'].map((amount) => (
                  <Button key={amount} variant="outline" className="hover:bg-orange-100">
                    {amount}
                  </Button>
                ))}
              </div>
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Recarregar Saldo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChannelSettings;
