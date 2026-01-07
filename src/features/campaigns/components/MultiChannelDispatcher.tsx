/**
 * Multi-Channel Dispatcher Component
 * Unified interface for managing campaigns across WhatsApp, Email, Telegram, and SMS
 * Phase 4: Multi-Channel Broadcasting
 */

import React, { useState, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Mail, 
  Send, 
  Phone,
  Plus,
  Settings,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components';

// Lazy load channel-specific components
const WhatsAppDispatcher = lazy(() =>
  import('./channels/WhatsAppDispatcher').then(m => ({ default: m.WhatsAppDispatcher }))
);
const EmailDispatcher = lazy(() =>
  import('./channels/EmailDispatcher').then(m => ({ default: m.EmailDispatcher }))
);
const TelegramDispatcher = lazy(() =>
  import('./channels/TelegramDispatcher').then(m => ({ default: m.TelegramDispatcher }))
);
const SMSDispatcher = lazy(() =>
  import('./channels/SMSDispatcher').then(m => ({ default: m.SMSDispatcher }))
);
const ChannelSettings = lazy(() =>
  import('./channels/ChannelSettings').then(m => ({ default: m.ChannelSettings }))
);

interface ChannelStats {
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  totalCampaigns: number;
  totalSent: number;
  totalScheduled: number;
  color: string;
}

export function MultiChannelDispatcher() {
  const [activeChannel, setActiveChannel] = useState('whatsapp');
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({
    whatsapp: {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      status: 'connected',
      totalCampaigns: 12,
      totalSent: 2847,
      totalScheduled: 3,
      color: 'bg-green-50 border-green-200'
    },
    email: {
      name: 'Email',
      icon: <Mail className="h-5 w-5" />,
      status: 'connected',
      totalCampaigns: 8,
      totalSent: 1523,
      totalScheduled: 5,
      color: 'bg-blue-50 border-blue-200'
    },
    telegram: {
      name: 'Telegram',
      icon: <Send className="h-5 w-5" />,
      status: 'disconnected',
      totalCampaigns: 0,
      totalSent: 0,
      totalScheduled: 0,
      color: 'bg-cyan-50 border-cyan-200'
    },
    sms: {
      name: 'SMS',
      icon: <Phone className="h-5 w-5" />,
      status: 'error',
      totalCampaigns: 2,
      totalSent: 156,
      totalScheduled: 1,
      color: 'bg-orange-50 border-orange-200'
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Disparos Multi-Canal</h2>
          <p className="text-neutral-600 mt-1">
            Gerencie campanhas em múltiplos canais de comunicação
          </p>
        </div>
      </div>

      {/* Channel Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(channelStats).map(([key, stats]) => (
          <Card 
            key={key}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              activeChannel === key ? 'ring-2 ring-primary' : ''
            } ${stats.color}`}
            onClick={() => setActiveChannel(key)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-white">
                  {stats.icon}
                </div>
                {getStatusBadge(stats.status)}
              </div>
              
              <h3 className="font-semibold text-neutral-900 mb-3">{stats.name}</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Campanhas</span>
                  <span className="font-semibold">{stats.totalCampaigns}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Enviados</span>
                  <span className="font-semibold">{stats.totalSent}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Agendados</span>
                  <span className="font-semibold text-blue-600">{stats.totalScheduled}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeChannel} onValueChange={setActiveChannel} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  {channelStats[activeChannel as keyof typeof channelStats]?.name} - Campanhas
                </h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Crie, gerencie e acompanhe campanhas via{' '}
                  {channelStats[activeChannel as keyof typeof channelStats]?.name}
                </p>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <TabsList className="grid w-full grid-cols-5 mb-6">
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
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-4">
              <Suspense fallback={<LoadingState message="Carregando WhatsApp..." />}>
                <WhatsAppDispatcher />
              </Suspense>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4">
              <Suspense fallback={<LoadingState message="Carregando Email..." />}>
                <EmailDispatcher />
              </Suspense>
            </TabsContent>

            {/* Telegram Tab */}
            <TabsContent value="telegram" className="space-y-4">
              <Suspense fallback={<LoadingState message="Carregando Telegram..." />}>
                <TelegramDispatcher />
              </Suspense>
            </TabsContent>

            {/* SMS Tab */}
            <TabsContent value="sms" className="space-y-4">
              <Suspense fallback={<LoadingState message="Carregando SMS..." />}>
                <SMSDispatcher />
              </Suspense>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Suspense fallback={<LoadingState message="Carregando configurações..." />}>
                <ChannelSettings />
              </Suspense>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Quick Stats Footer */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-neutral-600 mb-2">Total de Campanhas</p>
              <p className="text-3xl font-bold text-neutral-900">
                {Object.values(channelStats).reduce((sum, stat) => sum + stat.totalCampaigns, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-2">Total Enviado</p>
              <p className="text-3xl font-bold text-green-600">
                {Object.values(channelStats).reduce((sum, stat) => sum + stat.totalSent, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-2">Agendados</p>
              <p className="text-3xl font-bold text-blue-600">
                {Object.values(channelStats).reduce((sum, stat) => sum + stat.totalScheduled, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-2">Taxa de Sucesso</p>
              <p className="text-3xl font-bold text-primary">94.2%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiChannelDispatcher;
