import { Users, CalendarDays } from 'lucide-react';
import type { User } from '../../types/api';
import { formatCompact, formatDate } from '../../utils/format';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: User;
  selected?: boolean;
  onSelect: () => void;
}

export default function UserCard({ user, selected, onSelect }: UserCardProps) {
  return (
    <button
      className={`${styles.userCard} ${selected ? styles.userCardSelected : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.avatar}>
        {user.handle.slice(0, 2).toUpperCase()}
      </span>
      <span className={styles.info}>
        <span className={styles.displayName}>{user.displayName}</span>
        <span className={styles.handle}>@{user.handle}</span>
        <span className={styles.meta}>
          <span className={styles.followers}>
            <Users size={12} /> {formatCompact(user.followersCount)} followers
          </span>
          <span className={styles.followers}>
            <CalendarDays size={12} /> joined {formatDate(user.accountCreatedAt)}
          </span>
        </span>
      </span>
    </button>
  );
}
