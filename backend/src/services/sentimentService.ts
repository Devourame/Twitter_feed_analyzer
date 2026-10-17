/**
 * Client for the local Python (FastAPI) Twitter-RoBERTa inference service.
 * The service runs on the same machine and loads the model from
 * models/twitter-roberta-base-sentiment at startup, so this client only
 * forwards text and never triggers model downloads.
 */

const SENTIMENT_SERVICE_URL =
  process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8001';

export interface SentimentPrediction {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  scores: {
    negative: number;
    neutral: number;
    positive: number;
  };
  model: string;
  inferenceTimeMs: number;
}

export class SentimentServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SentimentServiceError';
    this.statusCode = statusCode;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${SENTIMENT_SERVICE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new SentimentServiceError(
      'Sentiment inference service is unreachable. Start it with: sentiment_service/start.bat (or see README-SENTIMENT.md).',
      503
    );
  }

  if (!response.ok) {
    let message = `Sentiment inference service error (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) message = String(body.detail);
    } catch {
      // no JSON body; keep default message
    }
    throw new SentimentServiceError(message, response.status === 422 ? 400 : 502);
  }

  return response.json() as Promise<T>;
}

/** Ask the inference service to classify a piece of text. */
export function predictSentiment(text: string): Promise<SentimentPrediction> {
  return requestJson<SentimentPrediction>('/predict', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** Check whether the inference service is up (and the model is loaded). */
export function checkSentimentHealth(): Promise<{
  status: string;
  model: string;
}> {
  return requestJson<{ status: string; model: string }>('/health');
}
