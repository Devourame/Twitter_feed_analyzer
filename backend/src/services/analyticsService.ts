import { Tweet } from '../models/Tweet';
import { User } from '../models/User';

/**
 * Service for analytical aggregation queries
 */
export class AnalyticsService {
  /**
   * Get overall statistics for dashboard overview
   */
  static async getOverview() {
    // Use MongoDB aggregation to compute all metrics in one go
    const result = await Tweet.aggregate([
      {
        $facet: {
          totalTweets: [{ $count: 'count' }],
          totalUsers: [
            { $group: { _id: '$userId' } },
            { $count: 'count' }
          ],
          totalLikes: [{ $group: { _id: null, total: { $sum: '$metrics.likes' } } }],
          totalRetweets: [{ $group: { _id: null, total: { $sum: '$metrics.retweets' } } }],
          totalReplies: [{ $group: { _id: null, total: { $sum: '$metrics.replies' } } }],
          avgEngagement: [
            {
              $addFields: {
                engagement: {
                  $add: [
                    '$metrics.likes',
                    { $multiply: ['$metrics.retweets', 2] },
                    { $multiply: ['$metrics.replies', 1.5] }
                  ]
                }
              }
            },
            { $group: { _id: null, avgEngagement: { $avg: '$engagement' } } }
          ]
        }
      },
      {
        $project: {
          totalTweets: { $arrayElemAt: ['$totalTweets.count', 0] },
          totalUsers: { $arrayElemAt: ['$totalUsers.count', 0] },
          totalLikes: { $arrayElemAt: ['$totalLikes.total', 0] },
          totalRetweets: { $arrayElemAt: ['$totalRetweets.total', 0] },
          totalReplies: { $arrayElemAt: ['$totalReplies.total', 0] },
          avgEngagement: { $arrayElemAt: ['$avgEngagement.avgEngagement', 0] }
        }
      }
    ]);

    if (result.length === 0) {
      return {
        totalTweets: 0,
        totalUsers: 0,
        totalLikes: 0,
        totalRetweets: 0,
        totalReplies: 0,
        avgEngagement: 0
      };
    }

    const {
      totalTweets,
      totalUsers,
      totalLikes,
      totalRetweets,
      totalReplies,
      avgEngagement
    } = result[0];

    return {
      totalTweets: totalTweets || 0,
      totalUsers: totalUsers || 0,
      totalLikes: totalLikes || 0,
      totalRetweets: totalRetweets || 0,
      totalReplies: totalReplies || 0,
      avgEngagement: Number(avgEngagement) || 0
    };
  }

  /**
   * Get tweet volume over time (grouped by day)
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   */
  static async getTimeline(startDate?: Date, endDate?: Date) {
    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const pipeline: any[] = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          tweetCount: '$count',
          _id: 0
        }
      }
    );

    return await Tweet.aggregate(pipeline);
  }

  /**
   * Get trending hashtags
   * @param limit Number of hashtags to return
   */
  static async getTrendingHashtags(limit = 10) {
    return await Tweet.aggregate([
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get top tweets by engagement score
   * @param limit Number of tweets to return
   */
  static async getTopTweets(limit = 10) {
    return await Tweet.aggregate([
      {
        $addFields: {
          engagementScore: {
            $add: [
              '$metrics.likes',
              { $multiply: ['$metrics.retweets', 2] },
              { $multiply: ['$metrics.replies', 1.5] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          tweetId: 1,
          userHandle: 1,
          text: 1,
          createdAt: 1,
          metrics: 1,
          hashtags: 1,
          engagementScore: 1
        }
      }
    ]);
  }

  /**
   * Get user activity and engagement rankings
   * @param limit Number of users to return
   */
  static async getUserActivity(limit = 10) {
    return await Tweet.aggregate([
      {
        $group: {
          _id: '$userId',
          userHandle: { $first: '$userHandle' },
          tweetCount: { $sum: 1 },
          totalLikes: { $sum: '$metrics.likes' },
          totalRetweets: { $sum: '$metrics.retweets' },
          totalReplies: { $sum: '$metrics.replies' }
        }
      },
      {
        $addFields: {
          totalEngagement: {
            $add: [
              '$totalLikes',
              { $multiply: ['$totalRetweets', 2] },
              { $multiply: ['$totalReplies', 1.5] }
            ]
          },
          avgEngagementPerTweet: {
            $divide: [
              {
                $add: [
                  '$totalLikes',
                  { $multiply: ['$totalRetweets', 2] },
                  { $multiply: ['$totalReplies', 1.5] }
                ]
              },
              '$tweetCount'
            ]
          }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userHandle: 1,
          tweetCount: 1,
          totalLikes: 1,
          totalRetweets: 1,
          totalReplies: 1,
          totalEngagement: 1,
          avgEngagementPerTweet: { $round: ['$avgEngagementPerTweet', 2] }
        }
      }
    ]);
  }

  /**
   * Get sentiment distribution
   */
  static async getSentimentDistribution() {
    return await Tweet.aggregate([
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          sentiment: '$_id',
          count: 1,
          percentage: {
            $round: [
              { $multiply: [{ $divide: ['$count', { $sum: '$count' }] }, 100] },
              2
            ]
          },
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get activity by hour of day (0-23)
   */
  static async getHourlyActivity() {
    return await Tweet.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          hour: '$_id',
          tweetCount: '$count',
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get activity by day of week (0-6, where 0 is Sunday)
   */
  static async getDailyActivity() {
    return await Tweet.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          dayOfWeek: '$_id',
          tweetCount: '$count',
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get total engagement per hashtag (likes + 2*retweets + 1.5*replies per tweet,
   * summed per hashtag). Supports the Trends page's hashtag engagement comparison.
   */
  static async getHashtagEngagement(limit = 10) {
    return await Tweet.aggregate([
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          tweetCount: { $sum: 1 },
          totalEngagement: {
            $sum: {
              $add: [
                '$metrics.likes',
                { $multiply: [2, '$metrics.retweets'] },
                { $multiply: [1.5, '$metrics.replies'] }
              ]
            }
          }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: limit },
      {
        $project: {
          hashtag: '$_id',
          tweetCount: 1,
          totalEngagement: { $round: ['$totalEngagement', 0] },
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get average and total engagement per sentiment group.
   * Supports the Trends page's sentiment-vs-engagement comparison.
   */
  static async getSentimentEngagement() {
    return await Tweet.aggregate([
      {
        $group: {
          _id: '$sentiment',
          tweetCount: { $sum: 1 },
          totalEngagement: {
            $sum: {
              $add: [
                '$metrics.likes',
                { $multiply: [2, '$metrics.retweets'] },
                { $multiply: [1.5, '$metrics.replies'] }
              ]
            }
          }
        }
      },
      {
        $project: {
          sentiment: '$_id',
          tweetCount: 1,
          totalEngagement: 1,
          avgEngagement: { $round: [{ $divide: ['$totalEngagement', '$tweetCount'] }, 2] },
          _id: 0
        }
      },
      { $sort: { totalEngagement: -1 } }
    ]);
  }
}
