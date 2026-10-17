import styles from './pages.module.css';

interface PlaceholderPageProps {
  title: string;
  description: string;
  endpoint: string;
}

/**
 * Phase 1 placeholder for pages whose full implementation lands in
 * Phase 2. The shell, navigation, and API layer are already live.
 */
export function PlaceholderPage({ title, description, endpoint }: PlaceholderPageProps) {
  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageDescription}>{description}</p>
      </header>
      <p className={styles.phaseNote}>
        This page is fully implemented in Phase 2 using live data from{' '}
        <code>{endpoint}</code>. The navigation, layout, and shared components
        are already in place.
      </p>
    </div>
  );
}
