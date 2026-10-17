// TypeScript types mirroring the backend's actual API response shapes.
// Source of truth: backend/src/controllers and backend/src/services.

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Tweet {
  _id: string;
  tweetId: string;
  userId: string;
  userHandle: string;
  text: string;
  createdAt: string;
  metrics: TweetMetrics;
  hashtags: string[];
  sentiment: Sentiment;
  /** Present only on text-search results (textScore from MongoDB $meta). */
  score?: number;
}

export interface TweetListResponse {
  success: boolean;
  data: Tweet[];
  pagination: Pagination;
}

export interface SingleTweetResponse {
  success: boolean;
  data: Tweet;
}

export interface User {
  _id: string;
  handle: string;
  displayName: string;
  followersCount: number;
  accountCreatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  success: boolean;
  data: User[];
  pagination: Pagination;
}

export interface SingleUserResponse {
  success: boolean;
  data: User;
}

export interface OverviewStats {
  totalTweets: number;
  totalUsers: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  avgEngagement: number;
}

export interface OverviewResponse {
  success: boolean;
  data: OverviewStats;
}

export interface TimelinePoint {
  date: string;      // YYYY-MM-DD
  tweetCount: number;
}

export interface HashtagCount {
  hashtag: string;
  count: number;
}

export interface TopTweet extends Omit<Tweet, 'sentiment' | 'userId'> {
  engagementScore: number;
  sentiment?: Sentiment;
}

export interface UserActivity {
  userHandle: string;
  tweetCount: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalEngagement: number;
  avgEngagementPerTweet: number;
}

export interface SentimentCount {
  sentiment: Sentiment;
  count: number;
}

export interface HourlyPoint {
  hour: number;      // 0-23
  tweetCount: number;
}

export interface DailyPoint {
  dayOfWeek: number; // 0-6 (MongoDB $dayOfWeek: 1=Sunday ... 7=Saturday)
  tweetCount: number;
}

export interface HashtagEngagement {
  hashtag: string;
  tweetCount: number;
  totalEngagement: number;
}

export interface SentimentEngagement {
  sentiment: Sentiment;
  tweetCount: number;
  totalEngagement: number;
  avgEngagement: number;
}

/** Tweet list query filters accepted by GET /api/tweets. */
export interface TweetFilters {
  page?: number;
  limit?: number;
  hashtag?: string;
  handle?: string;
  sentiment?: Sentiment | '';
  startDate?: string;
  endDate?: string;
}

/* ---------- Sentiment Lab (analyzed posts) ---------- */

export interface SentimentScores {
  negative: number;
  neutral: number;
  positive: number;
}

export interface AnalyzedPost {
  _id: string;
  text: string;
  hashtag: string;
  sentiment: Sentiment;
  confidence: number;
  scores: SentimentScores;
  model: string;
  inferenceTimeMs: number;
  createdAt: string;
}

export interface AnalyzedPostListResponse {
  success: boolean;
  data: AnalyzedPost[];
  pagination: Pagination;
}

export interface SentimentHealthResponse {
  success: boolean;
  available: boolean;
  status?: string;
  model?: string;
  message?: string;
}
