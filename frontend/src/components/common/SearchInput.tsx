import { Search } from 'lucide-react';
import styles from './common.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible label for screen readers. */
  label: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: SearchInputProps) {
  return (
    <div className={styles.searchWrapper}>
      <Search size={15} className={styles.searchIcon} />
      <input
        type="search"
        className={`${styles.input} ${styles.searchInput}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}
