/**
 * Additive dataset top-up: brings the application database to exactly
 * 300 users and 10,000 tweets WITHOUT deleting or modifying existing records.
 *
 * - Computes the missing counts from the live database at runtime.
 * - No-op when the targets are already met, so it is safe to rerun.
 * - Aborts without writing anything if counts already EXCEED the targets.
 * - Never drops collections or touches other databases.
 *
 * Run:  npm run seed:topup
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Tweet } from '../models/Tweet';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/twitter_analyzer';
const TARGET_USERS = 300;
const TARGET_TWEETS = 10000;

// Seeded RNG so repeated runs with the same gap produce identical records.
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  range(min: number, max: number): number { return min + Math.floor(this.next() * (max - min)); }
  rangeFloat(min: number, max: number): number { return min + this.next() * (max - min); }
  pick<T>(arr: T[]): T { return arr[this.range(0, arr.length)]; }
}

// --- Text generation (extended from seedDatabase.ts conventions) ---

const TOPICS: { topic: string; keywords: string[]; positive: string[]; negative: string[] }[] = [
  {
    topic: 'technology',
    keywords: ['AI', 'machine learning', 'database', 'programming', 'software', 'cloud', 'API', 'mongodb', 'docker'],
    positive: ['works beautifully', 'really impressed', 'loving it'],
    negative: ['keeps crashing', 'so frustrating', 'total mess'],
  },
  {
    topic: 'education',
    keywords: ['lecture', 'exam', 'study', 'assignment', 'campus', 'professor', 'textbook'],
    positive: ['aced it', 'great teacher', 'finally clicked'],
    negative: ['failed it', 'exhausted', 'so much pressure'],
  },
  {
    topic: 'entertainment',
    keywords: ['movie', 'series', 'album', 'concert', 'streaming', 'soundtrack', 'trailer'],
    positive: ['amazing show', 'instant classic', 'gave me chills'],
    negative: ['boring plot', 'wasted two hours', 'hugely disappointing'],
  },
  {
    topic: 'sports',
    keywords: ['football', 'basketball', 'match', 'team', 'championship', 'training', 'season'],
    positive: ['what a victory', 'unstoppable tonight', 'deserved the win'],
    negative: ['crushed in the final', 'terrible defending', 'season is over'],
  },
  {
    topic: 'food',
    keywords: ['recipe', 'pasta', 'coffee', 'brunch', 'bakery', 'grill', 'dessert'],
    positive: ['absolutely delicious', 'best in town', 'nailed the recipe'],
    negative: ['burnt it again', 'cold and bland', 'never ordering there'],
  },
  {
    topic: 'productivity',
    keywords: ['planner', 'deep work', 'deadline', 'workflow', 'calendar', 'focus', 'habits'],
    positive: ['finally organized', 'shipped everything early', 'feeling on top of it'],
    negative: ['drowning in tasks', 'missed the deadline', 'zero motivation today'],
  },
  {
    topic: 'general',
    keywords: ['weekend', 'weather', 'commute', 'neighbors', 'errands', 'holiday', 'plans'],
    positive: ['such a good day', 'small wins', 'grateful for this'],
    negative: ['one of those days', 'why does this always happen', 'totally drained'],
  },
];

const NEUTRAL_TEMPLATES = [
  'The {k} session starts at 6pm in the main hall.',
  'Notes from today: {k}, {k2}, and a short break in between.',
  'Reminder that the {k} registration deadline is next Friday.',
  'Can anyone share the {k} schedule for this month?',
  'Just a routine update on the {k} situation, nothing new.',
  'Currently reading about {k} and taking notes.',
  'The {k} meeting was moved to Thursday at 3pm.',
  'Comparing three {k} options before deciding this weekend.',
];

const POSITIVE_TEMPLATES = [
  'Finally tried {k} and {p}! Highly recommend.',
  'Great news: our {k} project {p}. More soon!',
  'What a week for {k} — {p}.',
  'Shoutout to the team, the {k} launch {p}.',
  'Started the morning with {k} and {p}.',
];

const NEGATIVE_TEMPLATES = [
  'The {k} setup {n}. Not my day.',
  'Disappointed: the {k} update {n}.',
  'Rough day — {k} {n} and I missed lunch too.',
  'Honestly the {k} experience {n}. Hope it improves.',
  'Stuck on {k} all afternoon, it {n}.',
];

function fill(template: string, rng: SeededRandom): { text: string; topic: (typeof TOPICS)[number] } {
  const topic = rng.pick(TOPICS);
  return {
    text: template
      .replace('{k2}', rng.pick(topic.keywords).toLowerCase())
      .replace('{k}', rng.pick(topic.keywords).toLowerCase())
      .replace('{p}', rng.pick(topic.positive))
      .replace('{n}', rng.pick(topic.negative)),
    topic,
  };
}

// Sentiment derived from the text itself, with neutral-heavy fallback weights
// matching the existing dataset distribution (50/30/20).
function sentimentFor(text: string, rng: SeededRandom): 'positive' | 'neutral' | 'negative' {
  const t = text.toLowerCase();
  const pos = TOPICS.flatMap((x) => x.positive).some((p) => t.includes(p));
  const neg = TOPICS.flatMap((x) => x.negative).some((n) => t.includes(n));
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  const r = rng.next();
  return r < 0.5 ? 'neutral' : r < 0.8 ? 'positive' : 'negative';
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const dbName = mongoose.connection.name;
  console.log(`Connected to database: "${dbName}" (target: twitter_analyzer from project config)`);

  const userCount = await User.countDocuments();
  const tweetCount = await Tweet.countDocuments();
  console.log(`Current counts: users=${userCount}, tweets=${tweetCount}`);

  if (userCount > TARGET_USERS || tweetCount > TARGET_TWEETS) {
    console.error(
      `ABORT: existing counts exceed targets (users ${userCount}/300, tweets ${tweetCount}/10000). ` +
      'No records were written. Review the discrepancy manually.'
    );
    await mongoose.disconnect();
    process.exit(2);
  }

  const usersToAdd = TARGET_USERS - userCount;
  const tweetsToAdd = TARGET_TWEETS - tweetCount;

  if (usersToAdd === 0 && tweetsToAdd === 0) {
    console.log('Targets already met. Nothing to insert (idempotent no-op).');
    await mongoose.disconnect();
    return;
  }

  const rng = new SeededRandom(2026);

  // --- Users ---
  let insertedUsers = 0;
  if (usersToAdd > 0) {
    // Continue the existing handle sequence (existing data uses user1000..user1299)
    const existingHandles = new Set((await User.find({}, { handle: 1 }).lean()).map((u) => u.handle));
    let maxSeq = 999;
    for (const h of existingHandles) {
      const m = /^user(\d+)$/.exec(h);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    }

    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery', 'Peyton', 'Morgan', 'Elena', 'Marcus', 'Nadia', 'Owen', 'Priya'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Chen', 'Patel', 'Novak', 'Okafor', 'Silva'];

    const users = [];
    for (let i = 0; i < usersToAdd; i++) {
      let handle: string;
      do { handle = `user${++maxSeq}`; } while (existingHandles.has(handle));
      existingHandles.add(handle);
      const uniform = rng.next();
      // Varied follower distribution: ordinary accounts plus ~5% larger ones
      const followers = rng.next() < 0.05
        ? rng.range(2000, 50000)
        : Math.floor(10 + 990 * (1 - uniform * uniform));
      users.push({
        handle,
        displayName: `${rng.pick(firstNames)} ${rng.pick(lastNames)}`,
        followersCount: followers,
        // Fixed vs the original seed script: relative to now, not the epoch
        accountCreatedAt: new Date(Date.now() - rng.rangeFloat(0.5, 5) * 365 * 24 * 60 * 60 * 1000),
      });
    }
    const res = await User.insertMany(users, { ordered: false });
    insertedUsers = res.length;
    console.log(`Inserted ${insertedUsers} users (handles ${users[0].handle}…${users[users.length - 1].handle})`);
  }

  // --- Tweets ---
  let insertedTweets = 0;
  if (tweetsToAdd > 0) {
    const allUsers = await User.find({}, { handle: 1, followersCount: 1 }).lean();
    if (allUsers.length === 0) throw new Error('No users found; cannot attach tweets.');

    const existingTweetIds = await Tweet.find({}, { tweetId: 1 }).lean();
    let maxSeq = 0;
    for (const t of existingTweetIds) {
      const m = /^TWT_(\d+)$/.exec(t.tweetId);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    }

    // Weight user selection by log(followers), same idea as the original seed
    const weights = allUsers.map((u) => Math.log10(u.followersCount + 1));
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const pickUser = () => {
      let pick = rng.next() * totalWeight;
      for (let j = 0; j < allUsers.length; j++) {
        pick -= weights[j];
        if (pick <= 0) return allUsers[j];
      }
      return allUsers[allUsers.length - 1];
    };

    const now = Date.now();
    const tweets = [];
    for (let i = 0; i < tweetsToAdd; i++) {
      const u = pickUser();
      // Timestamps spread over the last 90 days, biased to weekdays/evenings
      let ts: number;
      do {
        ts = now - rng.rangeFloat(0, 90 * 24 * 60 * 60 * 1000);
        const d = new Date(ts);
        const dayWeight = d.getDay() >= 1 && d.getDay() <= 5 ? 2 : 1;
        const hourWeight = d.getHours() >= 18 && d.getHours() <= 22 ? 2 : 1;
        if (rng.next() < (dayWeight * hourWeight) / 4) break;
      } while (true);

      // Pick a template family first so text and sentiment agree
      const roll = rng.next();
      const template = roll < 0.3 ? rng.pick(POSITIVE_TEMPLATES)
        : roll < 0.5 ? rng.pick(NEGATIVE_TEMPLATES)
        : rng.pick(NEUTRAL_TEMPLATES);
      const { text, topic } = fill(template, rng);
      const sentiment = sentimentFor(text, rng);

      // Engagement: modest for most, 5% substantially higher
      const high = rng.next() < 0.05;
      const scale = (lo: number, hi: number, fMin: number, fMax: number) =>
        Math.floor(rng.range(lo, hi) * (high ? rng.rangeFloat(fMin, fMax) : 1));

      const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
      const keywords = [...new Set([...words.slice(0, 3), ...topic.keywords.slice(0, 2).map((k) => k.toLowerCase())])];
      const hashtags = [...new Set([
        topic.topic,
        rng.pick(topic.keywords).toLowerCase().replace(/\s+/g, ''),
        rng.next() < 0.3 ? rng.pick(['news', 'tech', 'daily', 'life']) : null,
      ].filter(Boolean) as string[])];

      tweets.push({
        tweetId: `TWT_${String(++maxSeq).padStart(9, '0')}`,
        userId: u._id,
        userHandle: u.handle,
        text,
        createdAt: new Date(ts),
        metrics: {
          likes: scale(5, 50, 5, 15),
          retweets: scale(0, 20, 3, 10),
          replies: scale(0, 10, 2, 8),
        },
        hashtags,
        keywords,
        sentiment,
      });
    }
    const res = await Tweet.insertMany(tweets, { ordered: false });
    insertedTweets = res.length;
    console.log(`Inserted ${insertedTweets} tweets (TWT_${String(maxSeq - insertedTweets + 1).padStart(9, '0')}…TWT_${String(maxSeq).padStart(9, '0')})`);
  }

  // --- Post-insert verification from the database ---
  const [finalUsers, finalTweets] = await Promise.all([User.countDocuments(), Tweet.countDocuments()]);
  console.log(`Final database counts: users=${finalUsers}, tweets=${finalTweets}`);
  if (finalUsers !== TARGET_USERS || finalTweets !== TARGET_TWEETS) {
    console.error(`WARNING: targets not reached exactly (inserted users=${insertedUsers}, tweets=${insertedTweets}). Rerun the script to continue.`);
    process.exitCode = 1;
  } else {
    console.log('Dataset top-up completed successfully.');
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Top-up failed:', err instanceof Error ? err.message : err);
  try { await mongoose.disconnect(); } catch { /* already disconnected */ }
  process.exit(1);
});
