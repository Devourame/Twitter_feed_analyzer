import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  TrendingUp,
  FlaskConical,
  Activity,
  X,
} from 'lucide-react';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tweets', label: 'Tweet Explorer', icon: Search, end: false },
  { to: '/users', label: 'User Explorer', icon: Users, end: false },
  { to: '/trends', label: 'Trends & Engagement', icon: TrendingUp, end: false },
  { to: '/sentiment-lab', label: 'Sentiment Lab', icon: FlaskConical, end: false },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
        aria-label="Main navigation"
      >
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <Activity size={18} />
          </span>
          <span className={styles.brandText}>
            Tweet<span className={styles.brandAccent}>Pulse</span>
          </span>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={onClose}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          MongoDB · College Project
        </div>
      </aside>
    </>
  );
}
