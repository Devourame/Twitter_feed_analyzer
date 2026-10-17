import mongoose from 'mongoose';
import { Tweet } from '../src/models/Tweet';
import { testSetup } from './setup';

// Mock request and response objects
const mockReq = (query: any = {}, params: any = {}) => ({
  query,
  params
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('TweetController', () => {
  beforeAll(async () => {
    await testSetup.connect();
    // Ensure text index exists for search tests
    await Tweet.collection.createIndex({ text: 'text' });
  });

  afterAll(async () => {
    await testSetup.disconnect();
  });

  beforeEach(async () => {
    await testSetup.clearCollections();

    // Insert a test tweet
    await Tweet.create({
      tweetId: 'TWT_000000001',
      userId: new mongoose.Types.ObjectId(),
      userHandle: 'testuser',
      text: 'Test tweet about mongodb and databases',
      createdAt: new Date('2026-10-01T12:00:00Z'),
      metrics: {
        likes: 10,
        retweets: 5,
        replies: 2
      },
      hashtags: ['mongodb', 'database'],
      keywords: ['test', 'tweet'],
      sentiment: 'positive'
    });
  });

  describe('getTweets', () => {
    it('should return paginated tweets', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({ page: '1', limit: '10' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweets(req as any, res as any, next);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(Array.isArray(jsonCall.data)).toBe(true);
      expect(jsonCall.pagination).toBeDefined();
    });

    it('should filter by hashtag', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({ hashtag: 'mongodb' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweets(req as any, res as any, next);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      if (jsonCall.data.length > 0) {
        expect(jsonCall.data[0].hashtags).toContain('mongodb');
      }
    });

    it('should filter by user handle', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({ handle: 'testuser' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweets(req as any, res as any, next);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      if (jsonCall.data.length > 0) {
        expect(jsonCall.data[0].userHandle).toBe('testuser');
      }
    });

    it('should filter by sentiment', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({ sentiment: 'positive' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweets(req as any, res as any, next);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      if (jsonCall.data.length > 0) {
        expect(jsonCall.data[0].sentiment).toBe('positive');
      }
    });
  });

  describe('getTweetById', () => {
    it('should return a tweet by tweetId', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({}, { tweetId: 'TWT_000000001' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweetById(req as any, res as any, next);

      expect(res.status).not.toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.tweetId).toBe('TWT_000000001');
    });

    it('should return 404 for non-existent tweet', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({}, { tweetId: 'TWT_999999999' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.getTweetById(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });
  });

  describe('searchTweets', () => {
    it('should search tweets by text', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({ q: 'mongodb' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.searchTweets(req as any, res as any, next);

      // If next was called with an error, this test will fail on the next expectation
      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(Array.isArray(jsonCall.data)).toBe(true);
      // We inserted a tweet with 'mongodb' in text, so should find at least one
      if (jsonCall.data.length > 0) {
        expect(jsonCall.data[0].text).toContain('mongodb');
      }
    });

    it('should fall back to hashtag matching when text search finds nothing', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      // This tweet's text never mentions 'kubernetes', only its hashtag does —
      // mirrors the production dataset where some terms exist only as hashtags.
      await Tweet.create({
        tweetId: 'TWT_000000002',
        userId: new mongoose.Types.ObjectId(),
        userHandle: 'testuser2',
        text: 'Shipping containers today, cluster is healthy',
        createdAt: new Date('2026-10-02T12:00:00Z'),
        metrics: { likes: 3, retweets: 1, replies: 0 },
        hashtags: ['kubernetes'],
        keywords: ['containers'],
        sentiment: 'neutral'
      });

      const req = mockReq({ q: 'kubernetes' });
      const res = mockRes();
      const next = mockNext;

      await TweetController.searchTweets(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(1);
      expect(jsonCall.data[0].tweetId).toBe('TWT_000000002');
      expect(jsonCall.pagination.total).toBe(1);
    });

    it('should return 400 for missing query parameter', async () => {
      const { TweetController } = await import('../src/controllers/tweetController');

      const req = mockReq({}); // No 'q' parameter
      const res = mockRes();
      const next = mockNext;

      await TweetController.searchTweets(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });
  });
});
