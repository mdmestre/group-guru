/**
 * SMS Dispatcher Component
 * Manage SMS broadcasting campaigns
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone,
  AlertCircle,
  Eye,
  Copy,
  Trash2
} from 'lucide-react';

export function SMSDispatcher() {
  const campaigns = [
    {
      id: '1',
      name: 'Código de Confirmação',
      recipientCount: 156,
      status: 'completed',
      sentCount: 156,
      successRate: 94.5,
      cost: '$12.48'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Low Balance Alert */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">Saldo baixo</h4>
          <p className="text-sm text-red-800 mb-3">
            Seu saldo de SMS está baixo (apenas $5,32 restante). Recarregue para continuar enviando.
          </p>
          <Button size="sm" className="bg-red-600 hover:bg-red-700">
            Recarregar Saldo
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">1</div>
              <p className="text-sm text-neutral-600">Campanhas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">156</div>
              <p className="text-sm text-neutral-600">Enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">94.5%</div>
              <p className="text-sm text-neutral-600">Taxa de Entrega</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">$5.32</div>
              <p className="text-sm text-neutral-600">Saldo Restante</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Campanhas SMS</h3>
            <Button>
              <Phone className="h-4 w-4 mr-2" />
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
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-neutral-600">
                      {campaign.sentCount} / {campaign.recipientCount} enviados
                    </div>
                    <div className="text-green-600">
                      Taxa: {campaign.successRate.toFixed(1)}%
                    </div>
                    <div className="text-purple-600">
                      Custo: {campaign.cost}
                    </div>
                  </div>
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

      {/* Pricing Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Preços SMS</h3>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 rounded-lg">
              <h4 className="font-semibold mb-2">Brasil</h4>
              <p className="text-2xl font-bold text-primary mb-2">$0.032</p>
              <p className="text-sm text-neutral-600">por SMS</p>
            </div>
            <div className="p-4 border border-neutral-200 rounded-lg">
              <h4 className="font-semibold mb-2">Internacional</h4>
              <p className="text-2xl font-bold text-primary mb-2">$0.05 - $0.15</p>
              <p className="text-sm text-neutral-600">por SMS</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-2">Volume</h4>
              <p className="text-sm text-neutral-600">Desconto progressivo</p>
              <p className="text-sm text-blue-600 font-semibold mt-2">Mais de 10K: -15%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SMSDispatcher;
