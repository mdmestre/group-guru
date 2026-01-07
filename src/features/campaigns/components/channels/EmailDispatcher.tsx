/**
 * Email Dispatcher Component
 * Manage Email broadcasting campaigns
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail,
  Play,
  Pause,
  Trash2,
  Copy,
  Eye,
  AlertCircle
} from 'lucide-react';

export function EmailDispatcher() {
  const campaigns = [
    {
      id: '1',
      name: 'Newsletter Semanal',
      recipientCount: 1523,
      status: 'completed',
      sentCount: 1489,
      successRate: 97.8,
      createdAt: '2024-01-05'
    },
    {
      id: '2',
      name: 'Confirmação de Compra',
      recipientCount: 847,
      status: 'active',
      sentCount: 512,
      successRate: 98.5,
      createdAt: '2024-01-07'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Setup Alert */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-1">Email não configurado</h4>
          <p className="text-sm text-blue-800 mb-3">
            Para enviar campanhas por email, configure primeiro uma conta de email válida nas configurações.
          </p>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            Configurar Email
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">2</div>
              <p className="text-sm text-neutral-600">Campanhas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">2.0K</div>
              <p className="text-sm text-neutral-600">Enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">98.1%</div>
              <p className="text-sm text-neutral-600">Taxa de Entrega</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Campanhas de Email</h3>
            <Button disabled>
              <Mail className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-neutral-900">{campaign.name}</h4>
                    <Badge className="bg-blue-100 text-blue-800">✅ Concluído</Badge>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {campaign.sentCount} / {campaign.recipientCount} enviados ({campaign.successRate.toFixed(1)}%)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
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

export default EmailDispatcher;
