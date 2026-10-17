import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Tweet } from '../models/Tweet';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/twitter_analyzer';

async function verifyDatabase() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for verification\n');

  // 1. Number of users
  const userCount = await User.countDocuments();
  console.log(`✓ Total Users: ${userCount}`);

  // 2. Number of tweets
  const tweetCount = await Tweet.countDocuments();
  console.log(`✓ Total Tweets: ${tweetCount}`);

  // 3. Unique tweet IDs
  const uniqueTweetIds = await Tweet.distinct('tweetId');
  console.log(`✓ Unique Tweet IDs: ${uniqueTweetIds.length} (should match tweet count)`);

  // 4. Date range
  const dateRange = await Tweet.aggregate([
    {
      $group: {
        _id: null,
        earliest: { $min: '$createdAt' },
        latest: { $max: '$createdAt' }
      }
    }
  ]);
  if (dateRange.length > 0) {
    console.log(`✓ Date Range: ${dateRange[0].earliest.toISOString().split('T')[0]} to ${dateRange[0].latest.toISOString().split('T')[0]}`);
  }

  // 5. Sentiment distribution
  const sentimentDistribution = await Tweet.aggregate([
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  console.log('\n✓ Sentiment Distribution:');
  sentimentDistribution.forEach(item => {
    console.log(`  ${item._id}: ${item.count} (${((item.count / tweetCount) * 100).toFixed(1)}%)`);
  });

  // 6. Hashtag distribution (top 10)
  const hashtagDistribution = await Tweet.aggregate([
    { $unwind: '$hashtags' },
    {
      $group: {
        _id: '$hashtags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  console.log('\n✓ Top 10 Hashtags:');
  hashtagDistribution.forEach(item => {
    console.log(`  #${item._id}: ${item.count}`);
  });

  // 7. Engagement statistics
  const engagementStats = await Tweet.aggregate([
    {
      $group: {
        _id: null,
        avgLikes: { $avg: '$metrics.likes' },
        maxLikes: { $max: '$metrics.likes' },
        avgRetweets: { $avg: '$metrics.retweets' },
        maxRetweets: { $max: '$metrics.retweets' },
        avgReplies: { $avg: '$metrics.replies' },
        maxReplies: { $max: '$metrics.replies' }
      }
    }
  ]);
  if (engagementStats.length > 0) {
    const stats = engagementStats[0];
    console.log('\n✓ Engagement Statistics:');
    console.log(`  Likes: avg=${stats.avgLikes.toFixed(1)}, max=${stats.maxLikes}`);
    console.log(`  Retweets: avg=${stats.avgRetweets.toFixed(1)}, max=${stats.maxRetweets}`);
    console.log(`  Replies: avg=${stats.avgReplies.toFixed(1)}, max=${stats.maxReplies}`);
  }

  // 8. Sample tweet for text search verification
  const sampleTweet = await Tweet.findOne().select('text hashtags keywords sentiment metrics');
  if (sampleTweet) {
    console.log('\n✓ Sample Tweet:');
    console.log(`  Text: "${sampleTweet.text}"`);
    console.log(`  Hashtags: [${sampleTweet.hashtags.map(h => `#${h}`).join(', ')}]`);
    console.log(`  Keywords: [${sampleTweet.keywords.join(', ')}]`);
    console.log(`  Sentiment: ${sampleTweet.sentiment}`);
    console.log(`  Engagement: ${sampleTweet.metrics.likes} likes, ${sampleTweet.metrics.retweets} retweets, ${sampleTweet.metrics.replies} replies`);
  }

  await mongoose.disconnect();
  console.log('\n✓ Verification completed successfully!');
}

// Run verification
verifyDatabase()
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
