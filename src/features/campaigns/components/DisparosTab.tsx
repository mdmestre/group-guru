/**
 * Disparos Tab Component
 * Main component for campaign management
 * Phase 4: Disparos (Broadcasting)
 */

import React, { useState, Suspense, lazy } from 'react';
import { LoadingState } from '@/components';

// Lazy load the multi-channel dispatcher
const MultiChannelDispatcher = lazy(() =>
  import('./MultiChannelDispatcher').then((m) => ({ default: m.MultiChannelDispatcher }))
);

export function DisparosTab() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<LoadingState message="Carregando disparos..." />}>
        <MultiChannelDispatcher />
      </Suspense>
    </div>
  );
}

export default DisparosTab;

