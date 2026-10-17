import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';

/**
 * Controller for analytics operations
 */
export class AnalyticsController {
  /**
   * Get overview statistics for dashboard
   */
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await AnalyticsService.getOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet volume over time
   */
  static async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const timeline = await AnalyticsService.getTimeline(startDate, endDate);
      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending hashtags
   */
  static async getTrendingHashtags(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hashtags = await AnalyticsService.getTrendingHashtags(limit);
      res.json({
        success: true,
        data: hashtags
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top tweets by engagement score
   */
  static async getTopTweets(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topTweets = await AnalyticsService.getTopTweets(limit);
      res.json({
        success: true,
        data: topTweets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity and engagement rankings
   */
  static async getUserActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const userActivity = await AnalyticsService.getUserActivity(limit);
      res.json({
        success: true,
        data: userActivity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sentiment distribution
   */
  static async getSentimentDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const sentimentDist = await AnalyticsService.getSentimentDistribution();
      res.json({
        success: true,
        data: sentimentDist
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity by hour of day
   */
  static async getHourlyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const hourlyActivity = await AnalyticsService.getHourlyActivity();
      res.json({
        success: true,
        data: hourlyActivity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity by day of week
   */
  static async getDailyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const dailyActivity = await AnalyticsService.getDailyActivity();
      res.json({
        success: true,
        data: dailyActivity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total engagement per hashtag
   */
  static async getHashtagEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const data = await AnalyticsService.getHashtagEngagement(limit);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get engagement statistics per sentiment group
   */
  static async getSentimentEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getSentimentEngagement();
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
}
