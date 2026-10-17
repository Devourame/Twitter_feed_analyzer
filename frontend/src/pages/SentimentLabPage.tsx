import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, FlaskConical, Loader2, Send } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { fetchAnalyzedPosts, submitPostForAnalysis } from '../api/sentiment';
import SentimentBadge from '../components/common/SentimentBadge';
import { ErrorBox, EmptyBox } from '../components/common/StateBlocks';
import type { AnalyzedPost } from '../types/api';
import { formatDateTime } from '../utils/format';
import styles from './pages.module.css';

const MAX_TEXT_LENGTH = 512;

type Stage = 'idle' | 'sending' | 'inferring' | 'saved' | 'error';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'sending', label: 'Input received' },
  { key: 'inferring', label: 'Model inference' },
  { key: 'saved', label: 'Sentiment classified' },
];

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

function HistoryItem({ post }: { post: AnalyzedPost }) {
  return (
    <li className={styles.historyItem}>
      <div className={styles.historyHeader}>
        <span className={styles.historyTag}>#{post.hashtag}</span>
        <SentimentBadge sentiment={post.sentiment} />
      </div>
      <p className={styles.historyText}>{post.text}</p>
      <div className={styles.historyMeta}>
        <span>confidence {(post.confidence * 100).toFixed(1)}%</span>
        <span>{post.inferenceTimeMs} ms</span>
        <span>{formatDateTime(post.createdAt)}</span>
      </div>
    </li>
  );
}

export default function SentimentLabPage() {
  const [text, setText] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedPost | null>(null);
  const [stage, setStage] = useState<Stage>('idle');

  const [filterInput, setFilterInput] = useState('');
  const debouncedFilter = useDebounce(filterInput, 400);
  const normalizedFilter = debouncedFilter.trim().replace(/^#+/, '').toLowerCase();

  const history = useApi(
    (signal) => fetchAnalyzedPosts(normalizedFilter || undefined, 1, 20, signal),
    [normalizedFilter]
  );

  const textError = useMemo(() => {
    if (!text.trim()) return null;
    if (text.length > MAX_TEXT_LENGTH) {
      return `Post is too long (${text.length}/${MAX_TEXT_LENGTH} characters).`;
    }
    return null;
  }, [text]);

  const hashtagError =
    hashtag.trim() && hashtag.trim().replace(/^#+/, '').length > 64
      ? 'Hashtag must be at most 64 characters.'
      : null;

  const canSubmit =
    !submitting && text.trim().length > 0 && !textError && !hashtagError && hashtag.trim().length > 0;

  async function handleAnalyze() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setStage('sending');
    try {
      // Stage 1: input validated and sent to the Express backend,
      // which forwards it to the local Python inference service.
      await new Promise((r) => setTimeout(r, 250));
      setStage('inferring');
      const saved = await submitPostForAnalysis(text.trim(), hashtag.trim());
      setStage('saved');
      setResult(saved);
      history.refresh();
    } catch (err) {
      setStage('error');
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Analysis failed unexpectedly. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const historyData = history.data?.data ?? [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Sentiment Lab</h1>
        <p className={styles.pageDescription}>
          Submit your own post and classify it offline with the Cardiff NLP
          Twitter-RoBERTa model running locally. Every analysis is saved to
          MongoDB and listed below.
        </p>
      </div>

      <div className={styles.labGrid}>
        {/* -------- Submission panel -------- */}
        <section className={styles.card} aria-label="Post submission">
          <h2 className={styles.cardTitle}>Analyze a post</h2>
          <label className={styles.fieldLabel} htmlFor="lab-text">Post text</label>
          <textarea
            id="lab-text"
            className={styles.textArea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a post to analyze…"
            rows={5}
            maxLength={MAX_TEXT_LENGTH + 50}
            aria-invalid={!!textError}
            aria-describedby="lab-text-count"
            disabled={submitting}
          />
          <div className={styles.charCount} id="lab-text-count">
            {text.length}/{MAX_TEXT_LENGTH} characters
          </div>
          {textError && <p className={styles.fieldError} role="alert">{textError}</p>}

          <label className={styles.fieldLabel} htmlFor="lab-hashtag">Hashtag / category</label>
          <input
            id="lab-hashtag"
            className={styles.textInput}
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            placeholder="e.g. mongodb"
            maxLength={70}
            aria-invalid={!!hashtagError}
            disabled={submitting}
          />
          {hashtagError && <p className={styles.fieldError} role="alert">{hashtagError}</p>}

          <button
            className={styles.analyzeButton}
            onClick={handleAnalyze}
            disabled={!canSubmit}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className={styles.spin} /> Analyzing…
              </>
            ) : (
              <>
                <Send size={16} /> Analyze
              </>
            )}
          </button>
          {submitError && (
            <div className={styles.submitError} role="alert">
              {submitError}
            </div>
          )}
        </section>

        {/* -------- Result / pipeline panel -------- */}
        <section className={styles.card} aria-label="Analysis result">
          <h2 className={styles.cardTitle}>Result</h2>

          <ol className={styles.stageList} aria-label="Processing stages">
            {STAGES.map(({ key, label }) => {
              const order = ['sending', 'inferring', 'saved'];
              const currentIdx = order.indexOf(stage);
              const stageIdx = order.indexOf(key);
              const done =
                stage === 'error'
                  ? false
                  : currentIdx > stageIdx ||
                    (currentIdx === stageIdx && key === 'saved');
              const active = stage === key && !done;
              return (
                <li
                  key={key}
                  className={`${styles.stageItem} ${done ? styles.stageDone : ''} ${active ? styles.stageActive : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>

          {result ? (
            <div className={styles.resultBlock} aria-live="polite">
              <div className={styles.resultHeadline}>
                <span>Predicted sentiment:</span>
                <SentimentBadge sentiment={result.sentiment} />
              </div>
              <p className={styles.resultConfidence}>
                Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                {' · '}inference {result.inferenceTimeMs} ms
              </p>
              <p className={styles.resultModel}>model: {result.model}</p>
              <ScoreBar label="negative" value={result.scores.negative} />
              <ScoreBar label="neutral" value={result.scores.neutral} />
              <ScoreBar label="positive" value={result.scores.positive} />
              <p className={styles.savedNote}>
                ✓ Analysis complete — saved to MongoDB as{' '}
                <code>{result._id}</code>
              </p>
            </div>
          ) : (
            !submitting && (
              <p className={styles.resultPlaceholder}>
                {stage === 'error'
                  ? 'The last analysis failed. Fix the error above and retry.'
                  : 'Submit a post to see the model\'s classification here.'}
              </p>
            )
          )}
        </section>
      </div>

      {/* -------- History -------- */}
      <section className={styles.card} aria-label="Analysis history" style={{ marginTop: 24 }}>
        <div className={styles.historyHeaderRow}>
          <h2 className={styles.cardTitle}>
            <FlaskConical size={16} style={{ verticalAlign: '-2px' }} /> Analysis history
          </h2>
          <input
            className={styles.textInput}
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder="Filter by hashtag…"
            aria-label="Filter history by hashtag"
            style={{ maxWidth: 220 }}
          />
        </div>

        {history.loading ? (
          <p className={styles.historyMeta}>Loading history…</p>
        ) : history.error ? (
          <ErrorBox message={history.error} onRetry={history.refresh} />
        ) : historyData.length === 0 ? (
          <EmptyBox
            title="No analyzed posts yet"
            hint={
              normalizedFilter
                ? `Nothing saved for #${normalizedFilter} yet.`
                : 'Analyze your first post above.'
            }
          />
        ) : (
          <ul className={styles.historyList}>
            {historyData.map((post) => (
              <HistoryItem key={post._id} post={post} />
            ))}
          </ul>
        )}
        {history.data && history.data.pagination.total > historyData.length && (
          <p className={styles.historyMeta}>
            Showing {historyData.length} of {history.data.pagination.total} saved analyses.
          </p>
        )}
      </section>
    </div>
  );
}
