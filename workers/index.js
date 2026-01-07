/**
 * Workers Entry Point
 * 
 * Initializes and manages all workers
 */

import AutomationsWorker from './AutomationsWorker.js';
import CampaignsWorker from './CampaignsWorker.js';
import WebhooksWorker from './WebhooksWorker.js';
import JobsWorker from './JobsWorker.js';
import EventProcessor from '../core/events/EventProcessor.js';

class WorkersManager {
  constructor() {
    this.workers = {
      automations: null,
      campaigns: null,
      webhooks: null,
      jobs: null
    };
    this.eventProcessor = null;
  }

  async start() {
    console.log('[WorkersManager] Starting workers...');

    try {
      // Start event processor first (listens to events)
      this.eventProcessor = new EventProcessor();
      console.log('[WorkersManager] Event processor started');

      // Start workers
      this.workers.automations = new AutomationsWorker();
      console.log('[WorkersManager] Automations worker started');

      this.workers.campaigns = new CampaignsWorker();
      console.log('[WorkersManager] Campaigns worker started');

      this.workers.webhooks = new WebhooksWorker();
      console.log('[WorkersManager] Webhooks worker started');

      this.workers.jobs = new JobsWorker();
      console.log('[WorkersManager] Jobs worker started');

      console.log('[WorkersManager] All workers started successfully');
    } catch (error) {
      console.error('[WorkersManager] Error starting workers:', error.message);
      console.warn('[WorkersManager] Workers will not be available. Make sure Redis is running.');
      // Don't throw - allow server to continue without workers
    }
  }

  async stop() {
    console.log('[WorkersManager] Stopping workers...');

    // Stop event processor
    if (this.eventProcessor) {
      await this.eventProcessor.close();
    }

    // Stop all workers
    const stopPromises = Object.values(this.workers)
      .filter(w => w !== null)
      .map(w => w.close());

    await Promise.all(stopPromises);

    console.log('[WorkersManager] All workers stopped');
  }
}

// Singleton instance
const workersManager = new WorkersManager();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WorkersManager] SIGTERM received, shutting down...');
  await workersManager.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WorkersManager] SIGINT received, shutting down...');
  await workersManager.stop();
  process.exit(0);
});

export default workersManager;


