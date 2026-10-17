import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import TweetExplorerPage from './pages/TweetExplorerPage';
import UserExplorerPage from './pages/UserExplorerPage';
import TrendsPage from './pages/TrendsPage';
import SentimentLabPage from './pages/SentimentLabPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/tweets" element={<TweetExplorerPage />} />
        <Route path="/users" element={<UserExplorerPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/sentiment-lab" element={<SentimentLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
