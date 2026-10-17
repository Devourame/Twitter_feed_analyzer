import type { ReactNode } from 'react';
import { ErrorBox, EmptyBox, Skeleton } from './StateBlocks';
import styles from './common.module.css';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  /** Fixed pixel height for the chart area (Recharts needs one). */
  height?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyHint?: string;
  children: ReactNode;
}

export default function ChartContainer({
  title,
  subtitle,
  height = 260,
  loading,
  error,
  onRetry,
  isEmpty,
  emptyHint,
  children,
}: ChartContainerProps) {
  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <div>
        <h3 className={styles.chartTitle}>{title}</h3>
        {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
      </div>
      <div className={styles.chartBody} style={{ minHeight: height }}>
        {error ? (
          <ErrorBox message={error} onRetry={onRetry} />
        ) : loading ? (
          <Skeleton height={height} />
        ) : isEmpty ? (
          <EmptyBox title="No data available" hint={emptyHint} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Re-export so consumers need only one import for state blocks.
export { ErrorBox, EmptyBox, Skeleton } from './StateBlocks';
