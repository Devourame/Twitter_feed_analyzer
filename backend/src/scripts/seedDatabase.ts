import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Tweet } from '../models/Tweet';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/twitter_analyzer';

// Simple seeded random number generator (Park-Miller LCG)
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    // Returns a float in [0, 1)
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  // Get integer in range [min, max)
  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min));
  }
  // Get float in range [min, max)
  rangeFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Helper to pick a random element from an array
function pickOne<T>(arr: T[], rng: SeededRandom): T {
  return arr[rng.range(0, arr.length)];
}

// Helper to pick multiple unique elements
function pickMultiple<T>(arr: T[], count: number, rng: SeededRandom): T[] {
  const shuffled = [...arr].sort(() => rng.next() - 0.5);
  return shuffled.slice(0, count);
}

// Realistic data pools
const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery', 'Peyton', 'Morgan'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const displayNames = firstNames.map((f, i) => `${f} ${lastNames[i]}`);

// Topics for tweet text
const topics = [
  { topic: 'technology', keywords: ['AI', 'machine learning', 'database', 'programming', 'software', 'cloud', 'API'] },
  { topic: 'gaming', keywords: ['game', 'player', 'score', 'level', 'quest', 'multiplayer', 'esports'] },
  { topic: 'finance', keywords: ['stock', 'market', 'investment', 'crypto', 'bitcoin', 'trading', 'economy'] },
  { topic: 'sports', keywords: ['football', 'basketball', 'soccer', 'match', 'team', 'player', 'championship'] },
  { topic: 'entertainment', keywords: ['movie', 'show', 'music', 'album', 'celebrity', 'award', 'streaming'] }
];

// Popular hashtags (will appear frequently)
const popularHashtags = ['#technology', '#AI', '#database', '#programming', '#gaming', '#finance', '#sports', '#news'];
// Less common hashtags (will appear occasionally)
const lessCommonHashtags = ['#mongodb', '#nodejs', '#react', '#python', '#java', '#aws', '#docker', '#kubernetes'];

// Sentiment weights: neutral > positive > negative
const sentimentWeights = [
  { value: 'negative', weight: 0.2 },
  { value: 'neutral', weight: 0.5 },
  { value: 'positive', weight: 0.3 }
];

// Function to generate a realistic sentence
function generateSentence(rng: SeededRandom): string {
  const topic = pickOne(topics, rng);
  const keyword = pickOne(topic.keywords, rng);
  const templates = [
    `Just learned about ${keyword} and it's fascinating!`,
    `Working on a project involving ${keyword}. Progress is going well.`,
    `Thinking about the future of ${keyword}. What do you think?`,
    `Just read an interesting article on ${keyword}. Highly recommend.`,
    `Debating the pros and cons of ${keyword} with colleagues.`,
    `Excited to share my findings on ${keyword}!`,
    `Another day, another deep dive into ${keyword}.`,
    `How is ${keyword} impacting your industry?`,
    `Just attended a talk on ${keyword}. Mind-blowing stuff.`,
    `Exploring new trends in ${keyword} this week.`
  ];
  return pickOne(templates, rng);
}

// Function to generate a tweet
function generateTweet(userHandle: string, userId: mongoose.Types.ObjectId, tweetId: number, rng: SeededRandom): any {
  // Determine if this is a high-engagement tweet (top 5%)
  const isHighEngagement = rng.next() < 0.05;
  const baseLikes = rng.range(5, 50);
  const baseRetweets = rng.range(0, 20);
  const baseReplies = rng.range(0, 10);

  let likes, retweets, replies;
  if (isHighEngagement) {
    likes = baseLikes * rng.rangeFloat(5, 15); // 5x to 15x base
    retweets = baseRetweets * rng.rangeFloat(3, 10); // 3x to 10x base
    replies = baseReplies * rng.rangeFloat(2, 8); // 2x to 8x base
  } else {
    likes = baseLikes;
    retweets = baseRetweets;
    replies = baseReplies;
  }

  // Ensure integers
  likes = Math.floor(likes);
  retweets = Math.floor(retweets);
  replies = Math.floor(replies);

  // Generate hashtags: mix of popular and less common
  const numPopular = rng.range(0, 3);
  const numLessCommon = rng.range(0, 2);
  const hashtags = [
    ...pickMultiple(popularHashtags, numPopular, rng).map(tag => tag.slice(1)), // remove #
    ...pickMultiple(lessCommonHashtags, numLessCommon, rng).map(tag => tag.slice(1))
  ];

  // Generate keywords: from the sentence and some random topic keywords
  const sentence = generateSentence(rng);
  // Extract words from sentence (simple split) and filter
  const wordsFromText = sentence
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g) // words of at least 3 letters
    || [];
  // Get some topic keywords
  const topicKeywords = pickOne(topics, rng).keywords.map(k => k.toLowerCase());
  const keywords = [...new Set([...wordsFromText.slice(0, 3), ...topicKeywords.slice(0, 2)])]; // unique, limit

  // Sentiment based on weights
  const rand = rng.next();
  let cumulative = 0;
  let sentiment = 'neutral'; // default
  for (const { value, weight } of sentimentWeights) {
    cumulative += weight;
    if (rand < cumulative) {
      sentiment = value;
      break;
    }
  }

  // Timestamp: spread over last 90 days, with more activity on weekdays and evenings
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  // Generate a biased timestamp: more likely to be recent and on weekdays
  let timestamp;
  do {
    const offset = rng.rangeFloat(0, 90 * 24 * 60 * 60 * 1000);
    timestamp = now - offset;
    const date = new Date(timestamp);
    // Bias: weekdays (Mon-Fri) more likely, and evening hours (18-22) more likely
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const hour = date.getHours();
    const weekdayWeight = dayOfWeek >= 1 && dayOfWeek <= 5 ? 2 : 1; // weekdays weight 2
    const eveningWeight = hour >= 18 && hour <= 22 ? 2 : 1; // evening weight 2
    const combinedWeight = weekdayWeight * eveningWeight;
    if (rng.next() < combinedWeight / 4) { // max weight is 4
      break;
    }
  } while (true);

  return {
    tweetId: `TWT_${tweetId.toString().padStart(9, '0')}`, // e.g., TWT_000000001
    userId,
    userHandle,
    text: sentence,
    createdAt: new Date(timestamp),
    metrics: { likes, retweets, replies },
    hashtags,
    keywords,
    sentiment
  };
}

// Main seeding function
async function seedDatabase() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Optional: clear existing collections
  await User.deleteMany({});
  await Tweet.deleteMany({});
  console.log('Cleared existing data');

  const rng = new SeededRandom(42); // Fixed seed for reproducibility

  // Generate Users
  console.log('Generating users...');
  const users = [];
  const numUsers = 300;
  for (let i = 0; i < numUsers; i++) {
    // Follower count distribution: most users have low/moderate, few have high
    // Using a Pareto-like distribution: inverse of uniform squared
    const uniform = rng.next();
    const followers = Math.floor(10 + 990 * (1 - uniform * uniform)); // skew towards low
    const user = new User({
      handle: `user${i + 1000}`, // ensure uniqueness and avoid real handles
      displayName: pickOne(displayNames, rng),
      followersCount: followers,
      accountCreatedAt: new Date(rng.rangeFloat(1, 4) * 365 * 24 * 60 * 60 * 1000) // 1-4 years ago
    });
    users.push(user);
  }
  await User.insertMany(users);
  console.log(`Generated ${users.length} users`);

  // Generate Tweets
  console.log('Generating tweets...');
  const numTweets = 10000;
  const tweets = [];
  for (let i = 0; i < numTweets; i++) {
    // Pick a user: not uniform, influence by follower count (popular users more likely to tweet)
    // Weights: log(followers) to avoid extreme dominance
    const weights = users.map(u => Math.log10(u.followersCount + 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let pick = rng.next() * totalWeight;
    let userIndex = 0;
    for (let j = 0; j < users.length; j++) {
      pick -= weights[j];
      if (pick <= 0) {
        userIndex = j;
        break;
      }
    }
    const selectedUser = users[userIndex];

    const tweet = generateTweet(selectedUser.handle, selectedUser._id, i + 1, rng);
    tweets.push(tweet);

    // Progress indicator
    if ((i + 1) % 1000 === 0) {
      console.log(`Generated ${i + 1} / ${numTweets} tweets`);
    }
  }
  await Tweet.insertMany(tweets);
  console.log(`Generated ${tweets.length} tweets`);

  // Disconnect
  await mongoose.disconnect();
  console.log('Seeding completed successfully!');
}

// Run the seed function
seedDatabase()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
