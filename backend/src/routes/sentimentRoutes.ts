import { Router } from 'express';
import { AnalyzedPostController } from '../controllers/analyzedPostController';

const router = Router();

// Whether the local Python inference service is reachable
router.get('/health', AnalyzedPostController.getSentimentHealth);

export default router;
