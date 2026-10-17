import mongoose from 'mongoose';
import { Tweet } from '../src/models/Tweet';
import { AnalyzedPost } from '../src/models/AnalyzedPost';
import { testSetup } from './setup';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

const fakePrediction = {
  sentiment: 'positive' as const,
  confidence: 0.9123,
  scores: { negative: 0.021, neutral: 0.0667, positive: 0.9123 },
  model: 'cardiffnlp/twitter-roberta-base-sentiment',
  inferenceTimeMs: 55,
};

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

describe('TweetController.analyzeSentiment', () => {
  beforeAll(async () => {
    await testSetup.connect();
  });

  afterAll(async () => {
    await testSetup.disconnect();
  });

  beforeEach(async () => {
    await Tweet.deleteMany({});
    await AnalyzedPost.deleteMany({});
    mockedPredict.mockReset();
    mockNext.mockClear();

    await Tweet.create({
      tweetId: 'TWT_000042000',
      userId: new mongoose.Types.ObjectId(),
      userHandle: 'user1000',
      text: 'This new dashboard feature is absolutely wonderful to use!',
      createdAt: new Date('2026-10-01T12:00:00Z'),
      metrics: { likes: 10, retweets: 5, replies: 2 },
      hashtags: ['feedback'],
      keywords: ['dashboard'],
      // Deliberately contradictory dataset label: the fresh prediction must
      // come from the model, never from this stored value.
      sentiment: 'negative',
    });
  });

  async function call(tweetId: unknown) {
    const { TweetController } = await import('../src/controllers/tweetController');
    const req: any = { params: { tweetId }, body: {} };
    const res = mockRes();
    await TweetController.analyzeSentiment(req, res, mockNext);
    return res;
  }

  it('analyzes a valid tweet using its DATABASE text and saves the analysis', async () => {
    mockedPredict.mockImplementation(async (text: string) => {
      // Prove the text sent to inference is the stored tweet text
      expect(text).toBe('This new dashboard feature is absolutely wonderful to use!');
      return fakePrediction;
    });

    const res = await call('TWT_000042000');

    expect(mockedPredict).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.sentiment).toBe('positive');
    expect(body.data.source).toBe('tweet-explorer');
    expect(body.data.sourceTweetId).toBe('TWT_000042000');
    expect(body.data.sourceUserHandle).toBe('user1000');
    expect(body.sourceTweet.tweetId).toBe('TWT_000042000');
    expect(body.sourceTweet.datasetSentiment).toBe('negative');

    const saved = await AnalyzedPost.findOne({ sourceTweetId: 'TWT_000042000' });
    expect(saved).not.toBeNull();
    expect(saved!.text).toBe('This new dashboard feature is absolutely wonderful to use!');
    expect(saved!.confidence).toBeCloseTo(0.9123);
  });

  it('leaves the original tweet sentiment label unchanged', async () => {
    mockedPredict.mockResolvedValue(fakePrediction);
    await call('TWT_000042000');
    const tweet = await Tweet.findOne({ tweetId: 'TWT_000042000' });
    expect(tweet!.sentiment).toBe('negative');
  });

  it('returns 404 for an unknown tweet and saves nothing', async () => {
    const res = await call('TWT_999999999');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPredict).not.toHaveBeenCalled();
    expect(await AnalyzedPost.countDocuments({})).toBe(0);
  });

  it('returns 400 for invalid identifiers', async () => {
    for (const bad of ['', '   ', 'x'.repeat(65)]) {
      const res = await call(bad);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(mockedPredict).not.toHaveBeenCalled();
    expect(await AnalyzedPost.countDocuments({})).toBe(0);
  });

  it('does not save an analysis when inference fails', async () => {
    const { SentimentServiceError } = jest.requireActual(
      '../src/services/sentimentService'
    );
    mockedPredict.mockRejectedValue(
      new SentimentServiceError('inference service down', 503)
    );
    const res = await call('TWT_000042000');
    expect(res.status).toHaveBeenCalledWith(503);
    expect(await AnalyzedPost.countDocuments({})).toBe(0);
  });

  it('rejects invalid inference output without saving', async () => {
    const { SentimentServiceError } = jest.requireActual(
      '../src/services/sentimentService'
    );
    mockedPredict.mockRejectedValue(
      new SentimentServiceError(
        'Inference service returned an invalid prediction response.',
        502
      )
    );
    const res = await call('TWT_000042000');
    expect(res.status).toHaveBeenCalledWith(502);
    expect(await AnalyzedPost.countDocuments({})).toBe(0);
  });

  it('keeps existing Sentiment Lab records (no source fields) compatible', async () => {
    mockedPredict.mockResolvedValue(fakePrediction);
    // Simulate a legacy Sentiment Lab record with no source metadata
    const legacy = await AnalyzedPost.create({
      text: 'manually entered text',
      hashtag: 'manual',
      sentiment: 'neutral',
      confidence: 0.5,
      scores: { negative: 0.2, neutral: 0.5, positive: 0.3 },
      model: 'cardiffnlp/twitter-roberta-base-sentiment',
      inferenceTimeMs: 10,
    });

    await call('TWT_000042000');

    const reloaded = await AnalyzedPost.findById(legacy._id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.source).toBe('sentiment-lab');
    expect(reloaded!.sourceTweetId).toBeUndefined();
    // Both records coexist; history listing still returns them
    const all = await AnalyzedPost.find({}).sort({ createdAt: -1 });
    expect(all).toHaveLength(2);
  });

  it('allows a repeat analysis of the same tweet as a fresh record', async () => {
    mockedPredict.mockResolvedValue(fakePrediction);
    await call('TWT_000042000');
    await call('TWT_000042000');
    const records = await AnalyzedPost.find({ sourceTweetId: 'TWT_000042000' });
    expect(records).toHaveLength(2);
    expect(await Tweet.countDocuments({ tweetId: 'TWT_000042000' })).toBe(1);
  });
});

describe('validatePrediction', () => {
  it('accepts a well-formed prediction', () => {
    const { validatePrediction } = jest.requireActual('../src/services/sentimentService');
    expect(validatePrediction(fakePrediction)).toEqual(fakePrediction);
  });

  it.each([
    ['missing model', { ...fakePrediction, model: '' }],
    ['unknown sentiment', { ...fakePrediction, sentiment: 'mixed' }],
    ['confidence out of range', { ...fakePrediction, confidence: 1.5 }],
    ['missing score class', { ...fakePrediction, scores: { negative: 0.1, positive: 0.9 } }],
    ['negative latency', { ...fakePrediction, inferenceTimeMs: -1 }],
    [
      'confidence does not match predicted class',
      { ...fakePrediction, confidence: 0.0667 },
    ],
    ['null response', null],
  ])('rejects %s', (_name, bad) => {
    const { validatePrediction, SentimentServiceError } = jest.requireActual(
      '../src/services/sentimentService'
    );
    expect(() => validatePrediction(bad)).toThrow(SentimentServiceError);
  });
});
