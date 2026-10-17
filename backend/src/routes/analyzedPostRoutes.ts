import { Router } from 'express';
import { AnalyzedPostController } from '../controllers/analyzedPostController';

const router = Router();

// Analyze a submitted post with the local model and save the result
router.post('/', AnalyzedPostController.createAnalyzedPost);

// List saved analyses (pagination + optional hashtag filter)
router.get('/', AnalyzedPostController.getAnalyzedPosts);

// Single saved analysis by id
router.get('/:id', AnalyzedPostController.getAnalyzedPostById);

export default router;
