import { Request, Response, NextFunction } from 'express';
import { Tweet } from '../models/Tweet';
import { AnalyzedPost } from '../models/AnalyzedPost';
import {
  predictSentiment,
  SentimentServiceError,
} from '../services/sentimentService';

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

  /**
   * POST /api/tweets/:tweetId/analyze-sentiment
   * Generate a FRESH Twitter-RoBERTa prediction for an existing tweet's
   * database text and save it to analyzedposts. The tweet's stored
   * `sentiment` label (dataset label) is never modified or returned as
   * the prediction.
   */
  static async analyzeSentiment(req: Request, res: Response, next: NextFunction) {
    try {
      const tweetId = typeof req.params.tweetId === 'string' ? req.params.tweetId.trim() : '';
      if (!tweetId || tweetId.length > 64) {
        return res.status(400).json({
          success: false,
          message: 'A valid tweet identifier is required.',
        });
      }

      // Text comes from the database record, never from the request body.
      const tweet = await Tweet.findOne({ tweetId }).select('tweetId userHandle text sentiment hashtags');
      if (!tweet) {
        return res.status(404).json({
          success: false,
          message: `Tweet ${tweetId} not found.`,
        });
      }

      // Real inference via the local Python service; validates the response
      // shape and throws on failure, so nothing is saved for a bad run.
      const prediction = await predictSentiment(tweet.text);

      const saved = await AnalyzedPost.create({
        text: tweet.text,
        hashtag: tweet.hashtags?.length ? tweet.hashtags[0] : 'uncategorized',
        sentiment: prediction.sentiment,
        confidence: prediction.confidence,
        scores: prediction.scores,
        model: prediction.model,
        inferenceTimeMs: prediction.inferenceTimeMs,
        source: 'tweet-explorer',
        sourceTweetId: tweet.tweetId,
        sourceUserHandle: tweet.userHandle,
      });

      res.status(201).json({
        success: true,
        data: saved,
        sourceTweet: {
          tweetId: tweet.tweetId,
          userHandle: tweet.userHandle,
          // Clearly labelled dataset label, NOT the model prediction
          datasetSentiment: tweet.sentiment,
        },
      });
    } catch (error) {
      if (error instanceof SentimentServiceError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}
