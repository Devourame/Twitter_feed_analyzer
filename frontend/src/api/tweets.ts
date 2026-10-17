import { get } from './client';
import type {
  TweetListResponse,
  SingleTweetResponse,
  TweetFilters,
} from '../types/api';

/** GET /api/tweets — paginated + filtered tweet feed. */
export function fetchTweets(filters: TweetFilters, signal?: AbortSignal) {
  return get<TweetListResponse>('/api/tweets', { ...filters }, signal);
}

/** GET /api/tweets/:tweetId — single tweet. */
export function fetchTweetById(tweetId: string, signal?: AbortSignal) {
  return get<SingleTweetResponse>(`/api/tweets/${encodeURIComponent(tweetId)}`, undefined, signal);
}

/** GET /api/tweets/search?q= — MongoDB full-text search. */
export function searchTweets(
  q: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal
) {
  return get<TweetListResponse>('/api/tweets/search', { q, page, limit }, signal);
}
