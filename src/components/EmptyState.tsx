/**
 * Empty State Component
 */

import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullHeight?: boolean;
}

export function EmptyState({ 
  icon,
  title, 
  description,
  actionLabel,
  onAction,
  fullHeight = true 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullHeight ? 'min-h-[60vh]' : 'py-8'}`}>
      <div className="text-neutral-300">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
        {description && (
          <p className="text-neutral-600 max-w-sm">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
