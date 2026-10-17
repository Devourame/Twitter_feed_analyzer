import { Router } from 'express';
import { TweetController } from '../controllers/tweetController';
import { validatePagination, validateDateParams, validateSentiment } from '../middleware/validationMiddleware';

const router = Router();

// Get paginated tweets with filtering
router.get(
  '/',
  validatePagination,
  validateDateParams,
  validateSentiment,
  TweetController.getTweets
);

// Search tweets by text
router.get(
  '/search',
  validatePagination,
  TweetController.searchTweets
);

// Get single tweet by tweetId
router.get('/:tweetId', TweetController.getTweetById);

export default router;
