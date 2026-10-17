import mongoose from 'mongoose';
import { AnalyzedPost } from '../src/models/AnalyzedPost';
import { testSetup } from './setup';

// Mock request and response objects
const mockReq = (body: any = {}, query: any = {}, params: any = {}) => ({
  body,
  query,
  params,
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Fake prediction returned by the (mocked) Python inference service
const fakePrediction = {
  sentiment: 'positive' as const,
  confidence: 0.94,
  scores: { negative: 0.01, neutral: 0.05, positive: 0.94 },
  model: 'cardiffnlp/twitter-roberta-base-sentiment',
  inferenceTimeMs: 42,
};

// Mock the inference-service client so no real model is needed in tests
jest.mock('../src/services/sentimentService', () => {
  const actual = jest.requireActual('../src/services/sentimentService');
  return {
    ...actual,
    predictSentiment: jest.fn(),
    checkSentimentHealth: jest.fn(),
  };
});

import { predictSentiment } from '../src/services/sentimentService';
const mockedPredict = predictSentiment as jest.MockedFunction<typeof predictSentiment>;

describe('AnalyzedPostController', () => {
  beforeAll(async () => {
    await testSetup.connect();
  });

  afterAll(async () => {
    await testSetup.disconnect();
  });

  beforeEach(async () => {
    await AnalyzedPost.deleteMany({});
    mockedPredict.mockReset();
    mockNext.mockClear();
  });

  describe('createAnalyzedPost', () => {
    it('saves the prediction returned by the inference service', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );
      mockedPredict.mockResolvedValue(fakePrediction);

      const req = mockReq({ text: 'I love this project!', hashtag: '#MongoDB' });
      const res = mockRes();

      await AnalyzedPostController.createAnalyzedPost(req as any, res as any, mockNext);

      expect(mockedPredict).toHaveBeenCalledWith('I love this project!');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sentiment: 'positive',
            hashtag: 'mongodb',
            confidence: 0.94,
          }),
        })
      );
      expect(await AnalyzedPost.countDocuments({})).toBe(1);
    });

    it('rejects empty or whitespace-only text', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );
      const req = mockReq({ text: '   ', hashtag: 'test' });
      const res = mockRes();

      await AnalyzedPostController.createAnalyzedPost(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(await AnalyzedPost.countDocuments({})).toBe(0);
    });

    it('rejects text longer than 512 characters', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );
      const req = mockReq({ text: 'a'.repeat(513), hashtag: 'test' });
      const res = mockRes();

      await AnalyzedPostController.createAnalyzedPost(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(await AnalyzedPost.countDocuments({})).toBe(0);
    });

    it('rejects a missing hashtag', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );
      const req = mockReq({ text: 'hello world', hashtag: '' });
      const res = mockRes();

      await AnalyzedPostController.createAnalyzedPost(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('does not save anything when inference fails', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );
      const { SentimentServiceError } = jest.requireActual(
        '../src/services/sentimentService'
      );
      mockedPredict.mockRejectedValue(
        new SentimentServiceError('inference service down', 503)
      );

      const req = mockReq({ text: 'hello world', hashtag: 'test' });
      const res = mockRes();

      await AnalyzedPostController.createAnalyzedPost(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(await AnalyzedPost.countDocuments({})).toBe(0);
    });
  });

  describe('getAnalyzedPosts', () => {
    it('lists saved posts and filters by hashtag', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );

      await AnalyzedPost.create([
        { ...fakePrediction, text: 'post one', hashtag: 'mongodb' },
        { ...fakePrediction, text: 'post two', hashtag: 'react' },
      ]);

      const allReq = mockReq({}, { page: '1', limit: '10' });
      const allRes = mockRes();
      await AnalyzedPostController.getAnalyzedPosts(allReq as any, allRes as any, mockNext);
      expect(allRes.json.mock.calls[0][0].data).toHaveLength(2);

      const filteredReq = mockReq({}, { page: '1', limit: '10', hashtag: '#MongoDB' });
      const filteredRes = mockRes();
      await AnalyzedPostController.getAnalyzedPosts(filteredReq as any, filteredRes as any, mockNext);
      expect(filteredRes.json.mock.calls[0][0].data).toHaveLength(1);
      expect(filteredRes.json.mock.calls[0][0].data[0].hashtag).toBe('mongodb');
    });
  });

  describe('getAnalyzedPostById', () => {
    it('returns 400 for an invalid id and 404 for a missing one', async () => {
      const { AnalyzedPostController } = await import(
        '../src/controllers/analyzedPostController'
      );

      const badReq = mockReq({}, {}, { id: 'not-an-objectid' });
      const badRes = mockRes();
      await AnalyzedPostController.getAnalyzedPostById(badReq as any, badRes as any, mockNext);
      expect(badRes.status).toHaveBeenCalledWith(400);

      const missingReq = mockReq(
        {},
        {},
        { id: new mongoose.Types.ObjectId().toString() }
      );
      const missingRes = mockRes();
      await AnalyzedPostController.getAnalyzedPostById(missingReq as any, missingRes as any, mockNext);
      expect(missingRes.status).toHaveBeenCalledWith(404);
    });
  });
});
