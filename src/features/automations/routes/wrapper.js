// Wrapper for automation routes - loads compiled TypeScript
// This is a temporary bridge until we have a full TS build setup
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to import the actual routes
try {
  const automationRoutes = await import('./index.ts');
  export default automationRoutes.default;
} catch (error) {
  console.warn('⚠️  Could not load automation routes from TypeScript:', error.message);
  
  // Fallback: Create a dummy router
  import('express').then(({ Router }) => {
    const router = Router();
    router.get('/automations', (req, res) => {
      res.status(503).json({ error: 'Automation routes not loaded. TypeScript compilation required.' });
    });
    export default router;
  });
}

