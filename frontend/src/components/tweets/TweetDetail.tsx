import { useApi } from '../../hooks/useApi';
import { fetchTweetById } from '../../api/tweets';
import { Loading, ErrorBox } from '../common/StateBlocks';
import { formatDateTime, formatNumber } from '../../utils/format';
import styles from './TweetCard.module.css';

/**
 * Expandable detail section for a tweet. Fetches the full document
 * (GET /api/tweets/:tweetId) only when mounted — i.e. when the user
 * expands the card.
 */
export default function TweetDetail({ tweetId }: { tweetId: string }) {
  const { data, loading, error, refresh } = useApi(
    (signal) => fetchTweetById(tweetId, signal),
    [tweetId]
  );

  if (loading) return <Loading label="Loading details…" />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data?.data) return null;

  const t = data.data;

  return (
    <>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Tweet ID</span>
        <span className={styles.detailValue}>{t.tweetId}</span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Posted at (exact)</span>
        <span className={styles.detailValue}>{formatDateTime(t.createdAt)}</span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Likes / Retweets / Replies</span>
        <span className={styles.detailValue}>
          {formatNumber(t.metrics.likes)} / {formatNumber(t.metrics.retweets)} / {formatNumber(t.metrics.replies)}
        </span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>MongoDB document _id</span>
        <span className={styles.detailValue}>{t._id}</span>
      </div>
    </>
  );
}
