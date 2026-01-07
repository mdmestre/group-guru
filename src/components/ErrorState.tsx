/**
 * Error State Component
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullHeight?: boolean;
}

export function ErrorState({ 
  title = 'Erro ao Carregar', 
  message, 
  onRetry,
  fullHeight = true 
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullHeight ? 'min-h-[60vh]' : 'py-8'}`}>
      <AlertCircle className="h-12 w-12 text-red-600" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
        <p className="text-neutral-600 mb-4 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}
