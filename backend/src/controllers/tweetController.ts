import { Request, Response, NextFunction } from 'express';
import { Tweet } from '../models/Tweet';

/**
 * Controller for tweet-related operations
 */
export class TweetController {
  /**
   * Get paginated list of tweets with optional filtering
   * Query params:
   *   page: page number (default: 1)
   *   limit: items per page (default: 20)
   *   hashtag: filter by hashtag
   *   handle: filter by user handle
   *   sentiment: filter by sentiment (positive/neutral/negative)
   *   startDate: filter tweets from this date (inclusive)
   *   endDate: filter tweets until this date (inclusive)
   */
  static async getTweets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
      const skip = (page - 1) * limit;

      // Build match stage for filtering
      const matchStage: any = {};

      // Filter by hashtag
      if (req.query.hashtag) {
        matchStage.hashtags = req.query.hashtag.toString().toLowerCase();
      }

      // Filter by user handle
      if (req.query.handle) {
        matchStage.userHandle = req.query.handle.toString().toLowerCase();
      }

      // Filter by sentiment
      if (req.query.sentiment) {
        const sentiment = req.query.sentiment.toString().toLowerCase();
        if (['positive', 'neutral', 'negative'].includes(sentiment)) {
          matchStage.sentiment = sentiment;
        }
      }

      // Filter by date range
      if (req.query.startDate || req.query.endDate) {
        matchStage.createdAt = {};
        if (req.query.startDate) {
          matchStage.createdAt.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          matchStage.createdAt.$lte = new Date(req.query.endDate as string);
        }
      }

      // Execute aggregation with pagination
      const [tweets, totalCount] = await Promise.all([
        Tweet.aggregate([
          { $match: matchStage },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              tweetId: 1,
              userId: 1,
              userHandle: 1,
              text: 1,
              createdAt: 1,
              metrics: 1,
              hashtags: 1,
              sentiment: 1,
              // Don't include keywords in list view to save bandwidth
            }
          }
        ]),
        Tweet.countDocuments(matchStage)
      ]);

      res.json({
        success: true,
        data: tweets,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single tweet by its tweetId
   */
  static async getTweetById(req: Request, res: Response, next: NextFunction) {
    try {
      const tweet = await Tweet.findOne({ tweetId: req.params.tweetId });
      if (!tweet) {
        return res.status(404).json({
          success: false,
          message: 'Tweet not found'
        });
      }

      res.json({
        success: true,
        data: tweet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search tweets by text using MongoDB text index
   * Query param:
   *   q: search query
   *   page: page number (default: 1)
   *   limit: items per page (default: 20)
   */
  static async searchTweets(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query parameter "q" is required'
        });
      }

      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
      const skip = (page - 1) * limit;

      // The dataset's tweet text is generated from topic templates, so some
      // searchable terms (e.g. "mongodb") exist only as hashtags. If the text
      // index finds nothing, fall back to an exact hashtag match so that
      // searching a hashtag keyword still returns its tweets.
      let matchStage: any = { $text: { $search: query } };
      let textSearch = true;
      const textCount = await Tweet.countDocuments({ $text: { $search: query } });
      if (textCount === 0) {
        matchStage = { hashtags: query.toLowerCase() };
        textSearch = false;
      }

      const [tweets, totalCount] = await Promise.all([
        textSearch
          ? Tweet.aggregate([
              { $match: matchStage },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  tweetId: 1,
                  userId: 1,
                  userHandle: 1,
                  text: 1,
                  createdAt: 1,
                  metrics: 1,
                  hashtags: 1,
                  score: { $meta: "textScore" } // Include text relevance score
                }
              }
            ])
          : Tweet.aggregate([
              { $match: matchStage },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  tweetId: 1,
                  userId: 1,
                  userHandle: 1,
                  text: 1,
                  createdAt: 1,
                  metrics: 1,
                  hashtags: 1
                  // No textScore for hashtag fallback matches
                }
              }
            ]),
        Tweet.countDocuments(matchStage)
      ]);

      res.json({
        success: true,
        data: tweets,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
