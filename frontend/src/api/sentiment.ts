import { get, ApiError } from './client';
import type {
  AnalyzedPost,
  AnalyzedPostListResponse,
  AnalyzeSentimentResponse,
  SentimentHealthResponse,
} from '../types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/** GET /api/analyzed-posts — saved analyses with optional hashtag filter. */
export function fetchAnalyzedPosts(
  hashtag?: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal
) {
  return get<AnalyzedPostListResponse>(
    '/api/analyzed-posts',
    { hashtag, page, limit },
    signal
  );
}

/** GET /api/sentiment/health — is the local inference service up? */
export function fetchSentimentHealth(signal?: AbortSignal) {
  return get<SentimentHealthResponse>('/api/sentiment/health', undefined, signal);
}

export interface AnalyzeResult {
  data: AnalyzedPost;
}

/**
 * POST /api/analyzed-posts — submit a post; the backend runs the local
 * Twitter-RoBERTa model via the Python service and saves the result.
 */
export async function submitPostForAnalysis(
  text: string,
  hashtag: string,
  signal?: AbortSignal
): Promise<AnalyzedPost> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/analyzed-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text, hashtag }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(
      'Cannot reach the backend. Make sure the API server is running.',
      0
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? `Request failed (HTTP ${response.status})`,
      response.status
    );
  }
  return (body as AnalyzeResult).data;
}

/**
 * POST /api/tweets/:tweetId/analyze-sentiment — ask the backend to run a
 * fresh local-model prediction on the tweet's stored text and save it.
 * The backend fetches the text from MongoDB; only the id is sent here.
 */
export async function analyzeExistingTweet(
  tweetId: string,
  signal?: AbortSignal
): Promise<AnalyzeSentimentResponse> {
  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/api/tweets/${encodeURIComponent(tweetId)}/analyze-sentiment`,
      { method: 'POST', headers: { Accept: 'application/json' }, signal }
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(
      'Cannot reach the backend. Make sure the API server is running.',
      0
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? `Request failed (HTTP ${response.status})`,
      response.status
    );
  }
  return body as AnalyzeSentimentResponse;
}
