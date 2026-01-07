/**
 * Loading State Component
 */

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullHeight?: boolean;
}

export function LoadingState({ message = 'Carregando...', fullHeight = true }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullHeight ? 'min-h-[60vh]' : 'py-8'}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      <p className="text-neutral-600">{message}</p>
    </div>
  );
}
