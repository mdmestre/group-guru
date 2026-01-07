/**
 * WhatsApp Dispatcher Component
 * Manage WhatsApp broadcasting campaigns
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle,
  Play,
  Pause,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  recipientCount: number;
  status: 'active' | 'paused' | 'completed' | 'scheduled';
  sentCount: number;
  successRate: number;
  createdAt: string;
  scheduledFor?: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Promoção Ano Novo 2024',
    recipientCount: 523,
    status: 'completed',
    sentCount: 523,
    successRate: 98.5,
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Confirmação de Pedido',
    recipientCount: 1247,
    status: 'active',
    sentCount: 1100,
    successRate: 96.2,
    createdAt: '2024-01-05'
  },
  {
    id: '3',
    name: 'Ofertas Semanais',
    recipientCount: 2048,
    status: 'scheduled',
    sentCount: 0,
    successRate: 0,
    createdAt: '2024-01-07',
    scheduledFor: '2024-01-14 10:00'
  }
];

export function WhatsAppDispatcher() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '🔴 Em Andamento';
      case 'paused':
        return '⏸️ Pausado';
      case 'completed':
        return '✅ Concluído';
      case 'scheduled':
        return '📅 Agendado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Channel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">15</div>
              <p className="text-sm text-neutral-600">Campanhas Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">4.7K</div>
              <p className="text-sm text-neutral-600">Mensagens Enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">97.2%</div>
              <p className="text-sm text-neutral-600">Taxa de Entrega</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Campanhas WhatsApp</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Gerencie todas as suas campanhas via WhatsApp
              </p>
            </div>
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-neutral-900">{campaign.name}</h4>
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1 text-neutral-600">
                      <Users className="h-4 w-4" />
                      {campaign.recipientCount} destinatários
                    </div>
                    <div className="flex items-center gap-1 text-neutral-600">
                      <TrendingUp className="h-4 w-4" />
                      {campaign.sentCount} enviados
                    </div>
                    <div className="flex items-center gap-1 text-neutral-600">
                      <Calendar className="h-4 w-4" />
                      {campaign.createdAt}
                    </div>
                    {campaign.successRate > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <span>✓ {campaign.successRate.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {campaign.status === 'active' && (
                    <Button size="sm" variant="ghost">
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {campaign.status === 'paused' && (
                    <Button size="sm" variant="ghost">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WhatsAppDispatcher;
