import type { Sentiment } from '../../types/api';
import styles from './common.module.css';

const CLASS_MAP: Record<Sentiment, string> = {
  positive: styles.badgePositive,
  neutral: styles.badgeNeutral,
  negative: styles.badgeNegative,
};

export default function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span className={`${styles.badge} ${CLASS_MAP[sentiment] ?? styles.badgeNeutral}`}>
      {sentiment}
    </span>
  );
}
