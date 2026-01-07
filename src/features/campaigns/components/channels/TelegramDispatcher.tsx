/**
 * Telegram Dispatcher Component
 * Manage Telegram broadcasting campaigns
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function TelegramDispatcher() {
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 mb-1">Telegram não conectado</h4>
          <p className="text-sm text-amber-800 mb-3">
            Nenhuma conta Telegram foi configurada. Conecte um bot Telegram para começar a enviar campanhas.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
              Conectar Bot Telegram
            </Button>
            <Button size="sm" variant="outline">
              Ver Documentação
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5" />
            Campanhas Telegram
          </h3>
        </CardHeader>

        <CardContent>
          <div className="text-center py-12">
            <div className="mb-4">
              <Send className="h-12 w-12 text-neutral-300 mx-auto" />
            </div>
            <h4 className="text-lg font-semibold text-neutral-900 mb-2">
              Nenhuma campanha Telegram
            </h4>
            <p className="text-neutral-600 mb-6">
              Configure uma conexão Telegram para começar a enviar campanhas.
            </p>
            <Button disabled>
              <Send className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Como conectar Telegram?</h3>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">Criar Bot no BotFather</h4>
              <p className="text-sm text-neutral-600">
                Converse com @BotFather no Telegram para criar um novo bot e obter seu token.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">Copiar Token do Bot</h4>
              <p className="text-sm text-neutral-600">
                O BotFather enviará um token. Copie este token de autenticação.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">Adicionar ao Agora</h4>
              <p className="text-sm text-neutral-600">
                Cole o token na seção de configurações do Telegram acima.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TelegramDispatcher;
