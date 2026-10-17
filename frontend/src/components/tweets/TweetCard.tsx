import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Repeat2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Tweet } from '../../types/api';
import AnalyzeSentiment from './AnalyzeSentiment';
import { engagementScore } from '../../utils/format';
import { formatDateTime, formatNumber } from '../../utils/format';
import styles from './TweetCard.module.css';

interface TweetCardProps {
  tweet: Tweet;
  /** Show the expandable detail section (fetched separately by id). */
  detail?: React.ReactNode;
}

export default function TweetCard({ tweet, detail }: TweetCardProps) {
  const [expanded, setExpanded] = useState(false);

  const score = engagementScore(tweet.metrics);

  return (
    <article className={styles.tweetCard}>
      <div className={styles.tweetHeader}>
        <span className={styles.avatar}>
          {tweet.userHandle.slice(0, 2).toUpperCase()}
        </span>
        <Link to={`/users?handle=${tweet.userHandle}`} className={styles.handleLink}>
          @{tweet.userHandle}
        </Link>
        <span className={styles.timestamp} title={tweet.createdAt}>
          {formatDateTime(tweet.createdAt)}
        </span>
      </div>

      <p className={styles.text}>{tweet.text}</p>

      {tweet.hashtags?.length > 0 && (
        <div className={styles.hashtags}>
          {tweet.hashtags.map((tag) => (
            <Link
              key={tag}
              to={`/tweets?hashtag=${tag}`}
              className={styles.hashtagLink}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.metrics}>
        <span className={styles.metric}>
          <Heart size={14} /> {formatNumber(tweet.metrics.likes)}
        </span>
        <span className={styles.metric}>
          <Repeat2 size={14} /> {formatNumber(tweet.metrics.retweets)}
        </span>
        <span className={styles.metric}>
          <MessageCircle size={14} /> {formatNumber(tweet.metrics.replies)}
        </span>
        <span className={styles.engagement} title="likes + 2×retweets + 1.5×replies (project-defined)">
          Score {formatNumber(Math.round(score))}
        </span>
        <AnalyzeSentiment tweet={tweet} />
      </div>

      {detail && (
        <>
          <button
            className={styles.detailToggle}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && <div className={styles.detailPanel}>{detail}</div>}
        </>
      )}
    </article>
  );
}
