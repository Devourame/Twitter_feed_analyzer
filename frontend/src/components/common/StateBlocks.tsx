import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import styles from './common.module.css';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.loadingBlock} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span>{label}</span>
    </div>
  );
}

/** Shimmer block used while a card/chart area loads. */
export function Skeleton({
  width = '100%',
  height = 120,
}: {
  width?: string | number;
  height?: number;
}) {
  return (
    <div
      className={styles.skeleton}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface ErrorBoxProps {
  message: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorBox({ message, hint, onRetry }: ErrorBoxProps) {
  return (
    <div className={`${styles.messageBlock} ${styles.errorBlock}`} role="alert">
      <AlertCircle size={22} />
      <span className={styles.messageText}>{message}</span>
      {hint && <span className={styles.messageHint}>{hint}</span>}
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

interface EmptyBoxProps {
  title?: string;
  hint?: string;
}

export function EmptyBox({ title = 'No results', hint }: EmptyBoxProps) {
  return (
    <div className={`${styles.messageBlock} ${styles.emptyBlock}`}>
      <Inbox size={22} />
      <span className={styles.messageText}>{title}</span>
      {hint && <span className={styles.messageHint}>{hint}</span>}
    </div>
  );
}
