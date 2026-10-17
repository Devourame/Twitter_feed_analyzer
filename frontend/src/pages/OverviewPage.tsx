import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import {
  fetchOverview, fetchTimeline, fetchSentiment, fetchHourly, fetchDaily,
  fetchTrendingHashtags, fetchTopTweets, fetchUserActivity,
} from '../api/analytics';
import { MetricCard } from '../components/common/MetricCard';
import ChartContainer from '../components/common/ChartContainer';
import { ErrorBox, Loading } from '../components/common/StateBlocks';
import { CHART_COLORS, DarkTooltip, SENTIMENT_FILL } from '../components/charts/chartTheme';
import { DAY_NAMES, formatCompact, formatDate, formatNumber } from '../utils/format';
import { MessageSquare, Users, Heart, Repeat2, Zap } from 'lucide-react';
import styles from './pages.module.css';

const gridStyle = { stroke: CHART_COLORS.grid };

export default function OverviewPage() {
  const overview = useApi(fetchOverview, []);
  const timeline = useApi(fetchTimeline, []);
  const sentiment = useApi(fetchSentiment, []);
  const hourly = useApi(fetchHourly, []);
  const daily = useApi(fetchDaily, []);
  const hashtags = useApi(fetchTrendingHashtags, []);
  const topTweets = useApi(fetchTopTweets, []);
  const topUsers = useApi(fetchUserActivity, []);

  const anyLoading =
    overview.loading || timeline.loading || sentiment.loading || hourly.loading ||
    daily.loading || hashtags.loading || topTweets.loading || topUsers.loading;

  const refreshAll = () => {
    overview.refresh(); timeline.refresh(); sentiment.refresh(); hourly.refresh();
    daily.refresh(); hashtags.refresh(); topTweets.refresh(); topUsers.refresh();
  };

  const hourData = (hourly.data?.data ?? []).map((p) => ({
    hour: `${String(p.hour).padStart(2, '0')}:00`,
    tweets: p.tweetCount,
  }));

  const dayData = (daily.data?.data ?? [])
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((p) => ({ day: DAY_NAMES[p.dayOfWeek - 1] ?? `Day ${p.dayOfWeek}`, tweets: p.tweetCount }));

  const sentimentData = (sentiment.data?.data ?? []).map((p) => ({
    name: p.sentiment,
    value: p.count,
  }));

  const totalSentiment = sentimentData.reduce((s, p) => s + p.value, 0);

  return (
    <div>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Analytics Overview</h1>
          <p className={styles.pageDescription}>
            Live statistics across the dataset — every number and chart is computed
            by MongoDB aggregation pipelines.
          </p>
        </div>
        <button className={styles.refreshButton} onClick={refreshAll} disabled={anyLoading}>
          <RefreshCw size={14} className={anyLoading ? styles.spin : undefined} /> Refresh
        </button>
      </header>

      {overview.error && (
        <ErrorBox
          message={overview.error}
          hint="Check that the backend is running on port 5000."
          onRetry={overview.refresh}
        />
      )}

      {overview.loading && <Loading label="Loading dashboard statistics…" />}

      {overview.data?.data && (
        <div className={`${styles.grid} ${styles.kpiGrid}`}>
          <MetricCard label="Total Tweets" value={overview.data.data.totalTweets} icon={MessageSquare} compact />
          <MetricCard label="Total Users" value={overview.data.data.totalUsers} icon={Users} compact />
          <MetricCard label="Total Likes" value={overview.data.data.totalLikes} icon={Heart} compact />
          <MetricCard label="Total Retweets" value={overview.data.data.totalRetweets} icon={Repeat2} compact />
          <MetricCard
            label="Avg Engagement Score"
            value={overview.data.data.avgEngagement}
            icon={Zap}
            hint="likes + 2×retweets + 1.5×replies (project-defined)"
          />
        </div>
      )}

      <div className={`${styles.grid} ${styles.cardGrid2}`} style={{ marginTop: 24 }}>
        <ChartContainer
          title="Tweet activity over time"
          subtitle="Tweets per day"
          loading={timeline.loading}
          error={timeline.error}
          onRetry={timeline.refresh}
          isEmpty={(timeline.data?.data?.length ?? 0) === 0}
          height={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeline.data?.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="date" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(d: string) => formatDate(d).slice(0, 6)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={formatCompact} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="tweetCount" name="Tweets" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primaryDim} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Sentiment distribution"
          subtitle={`${formatNumber(totalSentiment)} tweets classified`}
          loading={sentiment.loading}
          error={sentiment.error}
          onRetry={sentiment.refresh}
          isEmpty={sentimentData.length === 0}
          height={280}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
                {sentimentData.map((entry) => (
                  <Cell key={entry.name} fill={SENTIMENT_FILL(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend formatter={(value) => <span style={{ color: '#97a3b6', textTransform: 'capitalize' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Hourly activity"
          subtitle="Tweet volume by hour of day"
          loading={hourly.loading}
          error={hourly.error}
          onRetry={hourly.refresh}
          isEmpty={hourData.length === 0}
          height={260}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="hour" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={formatCompact} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(34,211,238,0.06)' }} />
              <Bar dataKey="tweets" name="Tweets" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Daily activity"
          subtitle="Tweet volume by day of week"
          loading={daily.loading}
          error={daily.error}
          onRetry={daily.refresh}
          isEmpty={dayData.length === 0}
          height={260}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="day" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={formatCompact} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(34,211,238,0.06)' }} />
              <Bar dataKey="tweets" name="Tweets" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Trending hashtags"
          subtitle="Most frequently used tags"
          loading={hashtags.loading}
          error={hashtags.error}
          onRetry={hashtags.refresh}
          isEmpty={(hashtags.data?.data?.length ?? 0) === 0}
          height={280}
        >
          <ol className={styles.rankList}>
            {(hashtags.data?.data ?? []).slice(0, 10).map((h, i) => (
              <li key={h.hashtag} className={styles.rankRow}>
                <span className={styles.rankIndex}>{i + 1}</span>
                <Link className={styles.rankMain} to={`/tweets?hashtag=${h.hashtag}`}>#{h.hashtag}</Link>
                <span className={styles.rankValue}>{formatCompact(h.count)}</span>
                <span className={styles.rankSub}>tweets</span>
              </li>
            ))}
          </ol>
        </ChartContainer>

        <ChartContainer
          title="Top-performing tweets"
          subtitle="Ranked by project-defined engagement score"
          loading={topTweets.loading}
          error={topTweets.error}
          onRetry={topTweets.refresh}
          isEmpty={(topTweets.data?.data?.length ?? 0) === 0}
          height={280}
        >
          <ol className={styles.rankList}>
            {(topTweets.data?.data ?? []).slice(0, 8).map((t, i) => (
              <li key={t.tweetId} className={styles.rankRow}>
                <span className={styles.rankIndex}>{i + 1}</span>
                <Link className={styles.rankMain} to={`/tweets?handle=${t.userHandle}`} title={t.text}>
                  @{t.userHandle}: {t.text}
                </Link>
                <span className={styles.rankValue}>{formatCompact(Math.round(t.engagementScore))}</span>
              </li>
            ))}
          </ol>
        </ChartContainer>

        <ChartContainer
          title="Most active users"
          subtitle="Ranked by total engagement generated"
          loading={topUsers.loading}
          error={topUsers.error}
          onRetry={topUsers.refresh}
          isEmpty={(topUsers.data?.data?.length ?? 0) === 0}
          height={280}
        >
          <ol className={styles.rankList}>
            {(topUsers.data?.data ?? []).slice(0, 10).map((u, i) => (
              <li key={u.userHandle} className={styles.rankRow}>
                <span className={styles.rankIndex}>{i + 1}</span>
                <Link className={styles.rankMain} to={`/users?handle=${u.userHandle}`}>@{u.userHandle}</Link>
                <span className={styles.rankSub}>{u.tweetCount} tweets</span>
                <span className={styles.rankValue}>{formatCompact(Math.round(u.totalEngagement))}</span>
              </li>
            ))}
          </ol>
        </ChartContainer>
      </div>
    </div>
  );
}
