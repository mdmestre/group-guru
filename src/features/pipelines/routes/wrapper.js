// Wrapper for pipeline routes - loads compiled TypeScript
// This is a temporary bridge until we have a full TS build setup
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to import the actual routes
try {
  const pipelineRoutes = await import('./index.ts');
  export default pipelineRoutes.default;
} catch (error) {
  console.warn('⚠️  Could not load pipeline routes from TypeScript:', error.message);
  
  // Fallback: Create a dummy router
  import('express').then(({ Router }) => {
    const router = Router();
    router.get('/pipelines', (req, res) => {
      res.status(503).json({ error: 'Pipeline routes not loaded. TypeScript compilation required.' });
    });
    export default router;
  });
}
