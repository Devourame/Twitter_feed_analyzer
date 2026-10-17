import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatCompact, formatNumber } from '../../utils/format';
import styles from './common.module.css';

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** Optional explanatory line (e.g. metric definition). */
  hint?: string;
  /** Use compact formatting (12.3K) — default false shows full numbers. */
  compact?: boolean;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  compact = false,
}: MetricCardProps) {
  return (
    <div className={`${styles.card} ${styles.metricCard}`}>
      <div className={styles.metricHeader}>
        <Icon size={15} className={styles.metricIcon} />
        <span>{label}</span>
      </div>
      <span className={styles.metricValue}>
        {compact ? formatCompact(value) : formatNumber(value)}
      </span>
      {hint && <span className={styles.metricHint}>{hint}</span>}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}
