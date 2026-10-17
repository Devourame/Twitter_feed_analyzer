import type { TweetMetrics } from '../types/api';

/**
 * Project-defined engagement score: likes + 2*retweets + 1.5*replies.
 * Matches the backend's aggregation formula. Used only in views where the
 * backend does not already return a score (e.g. plain tweet lists).
 */
export function engagementScore(metrics: TweetMetrics): number {
  return (
    metrics.likes +
    2 * metrics.retweets +
    1.5 * metrics.replies
  );
}

/** 12,345 → "12.3K"; 1,234,567 → "1.2M". */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Full locale formatting for tooltips and detail views. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
