import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { fetchTweets, searchTweets } from '../api/tweets';
import TweetCard from '../components/tweets/TweetCard';
import TweetDetail from '../components/tweets/TweetDetail';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterSelect from '../components/common/FilterSelect';
import { ErrorBox, EmptyBox, Loading } from '../components/common/StateBlocks';
import styles from './pages.module.css';

const PAGE_SIZE = 10;

export default function TweetExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // All filters live in the URL so links like /tweets?hashtag=mongodb&sentiment=positive
  // are shareable and the UI stays consistent with the address bar.
  const urlHandle = searchParams.get('handle') ?? '';
  const urlHashtag = searchParams.get('hashtag') ?? '';
  const sentiment = searchParams.get('sentiment') ?? '';
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);

  const isSearchMode = debouncedSearch.trim().length > 0;
  const hasFilters = Boolean(urlHandle || urlHashtag || sentiment || startDate || endDate);

  // Any filter change resets pagination to the first page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, urlHandle, urlHashtag, sentiment, startDate, endDate]);

  const tweets = useApi(
    (signal) =>
      isSearchMode
        ? searchTweets(debouncedSearch.trim(), page, PAGE_SIZE, signal)
        : fetchTweets(
            {
              page,
              limit: PAGE_SIZE,
              hashtag: urlHashtag || undefined,
              handle: urlHandle || undefined,
              sentiment: sentiment as 'positive' | 'neutral' | 'negative' | '',
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            },
            signal
          ),
    [isSearchMode, debouncedSearch, page, urlHandle, urlHashtag, sentiment, startDate, endDate]
  );

  const clearFilters = () => {
    setSearch('');
    setSearchParams({}, { replace: true });
  };

  const setUrlParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Tweet Explorer</h1>
          <p className={styles.pageDescription}>
            Search and filter all 10,000 tweets. Filtering and pagination run
            server-side through MongoDB queries.
          </p>
        </div>
      </header>

      <div className={styles.filterBar}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tweet text… (e.g. mongodb)"
          label="Search tweets"
        />

        <div className={styles.filterField}>
          <span>Username</span>
          <input
            className={styles.textInput}
            value={urlHandle}
            onChange={(e) => setUrlParam('handle', e.target.value.toLowerCase().trim())}
            placeholder="handle"
            aria-label="Filter by username"
          />
        </div>

        <div className={styles.filterField}>
          <span>Hashtag</span>
          <input
            className={styles.textInput}
            value={urlHashtag}
            onChange={(e) => setUrlParam('hashtag', e.target.value.toLowerCase().trim())}
            placeholder="tag"
            aria-label="Filter by hashtag"
          />
        </div>

        <FilterSelect
          label="Sentiment"
          value={sentiment}
          onChange={(v) => setUrlParam('sentiment', v)}
          options={[
            { value: '', label: 'All' },
            { value: 'positive', label: 'Positive' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'negative', label: 'Negative' },
          ]}
        />

        <div className={styles.filterField}>
          <span>From</span>
          <input
            type="date"
            className={styles.textInput}
            value={startDate}
            onChange={(e) => setUrlParam('startDate', e.target.value)}
            aria-label="Start date"
          />
        </div>

        <div className={styles.filterField}>
          <span>To</span>
          <input
            type="date"
            className={styles.textInput}
            value={endDate}
            onChange={(e) => setUrlParam('endDate', e.target.value)}
            aria-label="End date"
          />
        </div>

        {hasFilters && (
          <button className={styles.clearButton} onClick={clearFilters}>
            <XCircle size={14} /> Clear filters
          </button>
        )}
      </div>

      {isSearchMode && hasFilters && (
        <p className={styles.phaseNote} style={{ marginBottom: 16 }}>
          Full-text search is active — the username/hashtag/sentiment/date
          filters apply when the search box is empty.
        </p>
      )}

      {tweets.error && <ErrorBox message={tweets.error} onRetry={tweets.refresh} />}

      {tweets.loading && <Loading label="Loading tweets…" />}

      {!tweets.loading && !tweets.error && tweets.data && (
        <>
          {tweets.data.data.length === 0 ? (
            <EmptyBox
              title="No tweets match your query"
              hint={
                isSearchMode
                  ? 'Try a different keyword — search matches tweet text, falling back to hashtag matches.'
                  : 'Try widening or clearing the filters.'
              }
            />
          ) : (
            <div className={styles.tweetList}>
              {tweets.data.data.map((tweet) => (
                <TweetCard key={tweet._id} tweet={tweet} detail={<TweetDetail tweetId={tweet.tweetId} />} />
              ))}
            </div>
          )}

          <Pagination
            page={tweets.data.pagination.page}
            totalPages={tweets.data.pagination.totalPages}
            total={tweets.data.pagination.total}
            onPageChange={setPage}
            disabled={tweets.loading}
          />
        </>
      )}
    </div>
  );
}
