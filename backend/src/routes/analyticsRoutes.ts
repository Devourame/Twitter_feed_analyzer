import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

// Analytics endpoints
router.get('/overview', AnalyticsController.getOverview);
router.get('/timeline', AnalyticsController.getTimeline);
router.get('/hashtags', AnalyticsController.getTrendingHashtags);
router.get('/top-tweets', AnalyticsController.getTopTweets);
router.get('/users', AnalyticsController.getUserActivity);
router.get('/sentiment', AnalyticsController.getSentimentDistribution);
router.get('/hourly', AnalyticsController.getHourlyActivity);
router.get('/daily', AnalyticsController.getDailyActivity);
router.get('/hashtag-engagement', AnalyticsController.getHashtagEngagement);
router.get('/sentiment-engagement', AnalyticsController.getSentimentEngagement);

export default router;
