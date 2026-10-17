import { get } from './client';
import type {
  OverviewResponse,
  TimelinePoint,
  HashtagCount,
  HashtagEngagement,
  SentimentEngagement,
  TopTweet,
  UserActivity,
  SentimentCount,
  HourlyPoint,
  DailyPoint,
} from '../types/api';

type ListResponse<T> = { success: boolean; data: T };

/** GET /api/analytics/overview — dashboard KPIs. */
export function fetchOverview(signal?: AbortSignal) {
  return get<OverviewResponse>('/api/analytics/overview', undefined, signal);
}

/** GET /api/analytics/timeline — tweets per day. */
export function fetchTimeline(signal?: AbortSignal) {
  return get<ListResponse<TimelinePoint[]>>('/api/analytics/timeline', undefined, signal);
}

/** GET /api/analytics/hashtags — trending hashtags. */
export function fetchTrendingHashtags(signal?: AbortSignal) {
  return get<ListResponse<HashtagCount[]>>('/api/analytics/hashtags', undefined, signal);
}

/** GET /api/analytics/top-tweets — highest engagement tweets. */
export function fetchTopTweets(signal?: AbortSignal) {
  return get<ListResponse<TopTweet[]>>('/api/analytics/top-tweets', undefined, signal);
}

/** GET /api/analytics/users — user activity rankings. */
export function fetchUserActivity(signal?: AbortSignal) {
  return get<ListResponse<UserActivity[]>>('/api/analytics/users', undefined, signal);
}

/** GET /api/analytics/sentiment — sentiment distribution. */
export function fetchSentiment(signal?: AbortSignal) {
  return get<ListResponse<SentimentCount[]>>('/api/analytics/sentiment', undefined, signal);
}

/** GET /api/analytics/hourly — tweets per hour of day. */
export function fetchHourly(signal?: AbortSignal) {
  return get<ListResponse<HourlyPoint[]>>('/api/analytics/hourly', undefined, signal);
}

/** GET /api/analytics/daily — tweets per day of week. */
export function fetchDaily(signal?: AbortSignal) {
  return get<ListResponse<DailyPoint[]>>('/api/analytics/daily', undefined, signal);
}

/** GET /api/analytics/hashtag-engagement — total engagement per hashtag. */
export function fetchHashtagEngagement(signal?: AbortSignal) {
  return get<ListResponse<HashtagEngagement[]>>('/api/analytics/hashtag-engagement', undefined, signal);
}

/** GET /api/analytics/sentiment-engagement — engagement stats per sentiment. */
export function fetchSentimentEngagement(signal?: AbortSignal) {
  return get<ListResponse<SentimentEngagement[]>>('/api/analytics/sentiment-engagement', undefined, signal);
}
