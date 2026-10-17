import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import styles from './common.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Server-side pagination controls. Window of up to 5 page buttons
 * centered on the current page, plus prev/next.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  if (totalPages <= 1) {
    return (
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{total} result(s)</span>
      </div>
    );
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav
      className={styles.pagination}
      aria-label="Pagination"
    >
      <button
        className={styles.pageButton}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {start > 1 && <span className={styles.pageInfo}>…</span>}
      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.pageButton} ${p === page ? styles.pageButtonActive : ''}`}
          onClick={() => onPageChange(p)}
          disabled={disabled}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className={styles.pageInfo}>…</span>}

      <button
        className={styles.pageButton}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>

      <span className={styles.pageInfo}>
        Page {page} of {totalPages} · {total} total
      </span>
    </nav>
  );
}
