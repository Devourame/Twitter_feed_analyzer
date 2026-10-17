import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { fetchUsers, fetchUserByHandle } from '../api/users';
import { fetchTweets } from '../api/tweets';
import UserCard from '../components/users/UserCard';
import TweetCard from '../components/tweets/TweetCard';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import { ErrorBox, EmptyBox, Loading } from '../components/common/StateBlocks';
import { formatCompact, formatDate, formatNumber } from '../utils/format';
import styles from './pages.module.css';

const PAGE_SIZE = 12;
const TWEETS_PAGE_SIZE = 5;

export default function UserExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedHandle = searchParams.get('handle') ?? '';

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [tweetsPage, setTweetsPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    setTweetsPage(1);
  }, [selectedHandle]);

  const users = useApi(
    (signal) => fetchUsers(page, PAGE_SIZE, debouncedSearch.trim() || undefined, signal),
    [page, debouncedSearch]
  );

  const selectedUser = useApi(
    (signal) => fetchUserByHandle(selectedHandle, signal),
    [selectedHandle]
  );

  const userTweets = useApi(
    (signal) =>
      fetchTweets({ page: tweetsPage, limit: TWEETS_PAGE_SIZE, handle: selectedHandle }, signal),
    [selectedHandle, tweetsPage]
  );

  const selectUser = (handle: string) => {
    const next = new URLSearchParams(searchParams);
    if (handle && handle !== selectedHandle) next.set('handle', handle);
    else next.delete('handle');
    setSearchParams(next, { replace: true });
  };

  const user = selectedUser.data?.data;

  return (
    <div>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>User Explorer</h1>
          <p className={styles.pageDescription}>
            Browse all {formatNumber(300)} users in the dataset, sorted by
            follower count.
          </p>
        </div>
      </header>

      <div className={styles.filterBar}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by handle or display name…"
          label="Search users"
        />
      </div>

      {users.error && <ErrorBox message={users.error} onRetry={users.refresh} />}

      {users.loading && <Loading label="Loading users…" />}

      {!users.loading && !users.error && users.data && (
        <div className={styles.explorerGrid}>
          <div>
            {users.data.data.length === 0 ? (
              <EmptyBox
                title="No users match your search"
                hint="Search matches handles and display names."
              />
            ) : (
              <div className={styles.tweetList}>
                {users.data.data.map((u) => (
                  <UserCard
                    key={u._id}
                    user={u}
                    selected={u.handle === selectedHandle}
                    onSelect={() => selectUser(u.handle === selectedHandle ? '' : u.handle)}
                  />
                ))}
              </div>
            )}

            <Pagination
              page={users.data.pagination.page}
              totalPages={users.data.pagination.totalPages}
              total={users.data.pagination.total}
              onPageChange={setPage}
              disabled={users.loading}
            />
          </div>

          <aside className={styles.detailPanel}>
            {!selectedHandle && (
              <EmptyBox
                title="Select a user"
                hint="Click a user to see their profile and recent tweets."
              />
            )}

            {selectedHandle && selectedUser.error && (
              <ErrorBox message={selectedUser.error} onRetry={selectedUser.refresh} />
            )}

            {selectedHandle && selectedUser.loading && <Loading label="Loading profile…" />}

            {selectedHandle && user && (
              <div className={styles.card}>
                <div className={styles.detailProfileHeader}>
                  <span className={styles.detailAvatar}>
                    {user.handle.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className={styles.detailName}>{user.displayName}</div>
                    <div className={styles.detailHandle}>@{user.handle}</div>
                  </div>
                </div>

                <div className={styles.detailStats}>
                  <div className={styles.detailStat}>
                    <span className={styles.detailStatLabel}>Followers</span>
                    <span className={styles.detailStatValue}>
                      {formatNumber(user.followersCount)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailStatLabel}>Joined</span>
                    <span className={styles.detailStatValue}>
                      {formatDate(user.accountCreatedAt)}
                    </span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.detailStatLabel}>Tweets in dataset</span>
                    <span className={styles.detailStatValue}>
                      {userTweets.loading
                        ? '…'
                        : formatCompact(userTweets.data?.pagination.total ?? 0)}
                    </span>
                  </div>
                </div>

                <h4 className={styles.detailSectionTitle}>Recent tweets</h4>

                {userTweets.error && (
                  <ErrorBox message={userTweets.error} onRetry={userTweets.refresh} />
                )}

                {userTweets.loading && <Loading label="Loading tweets…" />}

                {userTweets.data && userTweets.data.data.length === 0 && (
                  <EmptyBox title="No tweets from this user" />
                )}

                {userTweets.data && userTweets.data.data.length > 0 && (
                  <>
                    <div className={styles.tweetList}>
                      {userTweets.data.data.map((t) => (
                        <TweetCard key={t._id} tweet={t} />
                      ))}
                    </div>
                    <Pagination
                      page={userTweets.data.pagination.page}
                      totalPages={userTweets.data.pagination.totalPages}
                      total={userTweets.data.pagination.total}
                      onPageChange={setTweetsPage}
                      disabled={userTweets.loading}
                    />
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
