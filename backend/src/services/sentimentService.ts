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
export async function predictSentiment(text: string): Promise<SentimentPrediction> {
  const raw = await requestJson<unknown>('/predict', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return validatePrediction(raw);
}

/** Check whether the inference service is up (and the model is loaded). */
export function checkSentimentHealth(): Promise<{
  status: string;
  model: string;
}> {
  return requestJson<{ status: string; model: string }>('/health');
}

const VALID_SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

/**
 * Validate the raw inference response shape. Throws SentimentServiceError
 * (502) so callers never persist a malformed prediction as a success.
 */
export function validatePrediction(raw: unknown): SentimentPrediction {
  const p = raw as Partial<SentimentPrediction> | null;
  const scores = p?.scores as Record<string, unknown> | undefined;
  const shapeOk =
    !!p &&
    typeof p.sentiment === 'string' &&
    VALID_SENTIMENTS.includes(p.sentiment as never) &&
    typeof p.confidence === 'number' &&
    p.confidence >= 0 &&
    p.confidence <= 1 &&
    !!scores &&
    VALID_SENTIMENTS.every(
      (k) => typeof scores[k] === 'number' && scores[k] >= 0 && scores[k] <= 1
    ) &&
    typeof p.model === 'string' &&
    p.model.length > 0 &&
    typeof p.inferenceTimeMs === 'number' &&
    p.inferenceTimeMs >= 0;
  if (!shapeOk) {
    throw new SentimentServiceError(
      'Inference service returned an invalid prediction response.',
      502
    );
  }
  // Confidence must be the predicted class's own score.
  if (Math.abs((p.confidence ?? 0) - (scores as any)[p.sentiment!]) > 1e-6) {
    throw new SentimentServiceError(
      'Inference service returned inconsistent confidence scores.',
      502
    );
  }
  return p as SentimentPrediction;
}
