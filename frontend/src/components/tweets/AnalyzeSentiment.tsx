import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { analyzeExistingTweet } from '../../api/sentiment';
import { ApiError } from '../../api/client';
import SentimentBadge from '../common/SentimentBadge';
import type { AnalyzedPost, Tweet } from '../../types/api';
import { formatDateTime } from '../../utils/format';
import styles from './TweetCard.module.css';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.scoreRow}>
      <span className={styles.scoreLabel}>{label}</span>
      <div className={styles.scoreTrack}>
        <div className={styles.scoreFill} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={styles.scoreValue}>{(value * 100).toFixed(1)}%</span>
    </div>
  );
}

/**
 * Per-tweet "Analyze Sentiment" action. Sends only the tweetId to the
 * backend; the backend reads the tweet's stored text from MongoDB, runs the
 * real local Twitter-RoBERTa model, saves the analysis to analyzedposts and
 * returns it. The tweet's dataset sentiment label is shown only as a
 * clearly-labelled comparison — never as the prediction.
 */
export default function AnalyzeSentiment({ tweet }: { tweet: Tweet }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedPost | null>(null);

  const run = useCallback(async () => {
    if (status === 'running') return; // block duplicate submissions
    setStatus('running');
    setError(null);
    setResult(null);
    try {
      const res = await analyzeExistingTweet(tweet.tweetId);
      setResult(res.data);
      setStatus('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Analysis failed unexpectedly.');
      setStatus('error');
    }
  }, [status, tweet.tweetId]);

  const close = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (status !== 'done' && status !== 'error') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, close]);

  return (
    <>
      <button
        className={styles.analyzeBtn}
        onClick={run}
        disabled={status === 'running'}
        aria-label={`Analyze sentiment of tweet ${tweet.tweetId}`}
        title="Run a fresh Twitter-RoBERTa prediction on this tweet"
      >
        {status === 'running' ? (
          <>
            <Loader2 size={13} className={styles.spin} /> Analyzing…
          </>
        ) : (
          <>
            <Sparkles size={13} /> Analyze Sentiment
          </>
        )}
      </button>

      {(status === 'done' || status === 'error') && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Sentiment analysis result"
          onClick={close}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Fresh sentiment analysis</h3>
              <button className={styles.modalClose} onClick={close} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {status === 'error' ? (
              <div className={styles.modalError} role="alert">
                {error}
                <button className={styles.retryLink} onClick={run}>
                  Retry
                </button>
              </div>
            ) : result ? (
              <div className={styles.modalBody}>
                <p className={styles.modalTweetText}>"{result.text}"</p>
                <div className={styles.modalMeta}>
                  <span>{result.sourceTweetId}</span>
                  <span>@{result.sourceUserHandle}</span>
                </div>

                <div className={styles.resultRow}>
                  <span>Fresh model prediction:</span>
                  <SentimentBadge sentiment={result.sentiment} />
                </div>

                <ScoreBar label="negative" value={result.scores.negative} />
                <ScoreBar label="neutral" value={result.scores.neutral} />
                <ScoreBar label="positive" value={result.scores.positive} />

                <div className={styles.resultRow}>
                  <span>Confidence:</span>
                  <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                  <span>· inference {result.inferenceTimeMs} ms</span>
                </div>
                <p className={styles.modalMeta}>
                  model: {result.model} · saved as {result._id} ·{' '}
                  {formatDateTime(result.createdAt)}
                </p>
                <p className={styles.savedNote}>✓ Analysis saved to MongoDB</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
