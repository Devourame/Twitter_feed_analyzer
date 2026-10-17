import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { AnalyzedPost } from '../models/AnalyzedPost';
import {
  predictSentiment,
  checkSentimentHealth,
  SentimentServiceError,
} from '../services/sentimentService';

const MAX_TEXT_LENGTH = 512;

/** Normalize a hashtag input to a bare, lowercase tag (strip leading '#' and spaces). */
function normalizeHashtag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase();
}

/**
 * Controller for user-submitted posts analyzed by the local
 * Twitter-RoBERTa sentiment model.
 */
export class AnalyzedPostController {
  /**
   * POST /api/analyzed-posts
   * Analyze a submitted post with the local model and save the result.
   */
  static async createAnalyzedPost(req: Request, res: Response, next: NextFunction) {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const hashtagRaw =
        typeof req.body?.hashtag === 'string' ? req.body.hashtag : '';

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Post text is required and cannot be empty.',
        });
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Post text must be at most ${MAX_TEXT_LENGTH} characters.`,
        });
      }

      const hashtag = normalizeHashtag(hashtagRaw);
      if (!hashtag) {
        return res.status(400).json({
          success: false,
          message: 'A hashtag (or category) is required.',
        });
      }
      if (hashtag.length > 64) {
        return res.status(400).json({
          success: false,
          message: 'Hashtag must be at most 64 characters.',
        });
      }

      // Real prediction from the local Python inference service.
      // If this throws, nothing is saved, so no record can falsely
      // appear to have been analyzed.
      const prediction = await predictSentiment(text);

      const saved = await AnalyzedPost.create({
        text,
        hashtag,
        sentiment: prediction.sentiment,
        confidence: prediction.confidence,
        scores: prediction.scores,
        model: prediction.model,
        inferenceTimeMs: prediction.inferenceTimeMs,
      });

      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      if (error instanceof SentimentServiceError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/analyzed-posts?page=&limit=&hashtag=
   * Retrieve saved analyses, newest first, with optional hashtag filter.
   */
  static async getAnalyzedPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (req.query.hashtag) {
        filter.hashtag = normalizeHashtag(req.query.hashtag as string);
      }

      const [posts, totalCount] = await Promise.all([
        AnalyzedPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        AnalyzedPost.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analyzed-posts/:id
   */
  static async getAnalyzedPostById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid post id.' });
      }
      const post = await AnalyzedPost.findById(id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Analyzed post not found.' });
      }
      res.json({ success: true, data: post });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sentiment/health
   * Whether the local inference service is available.
   */
  static async getSentimentHealth(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await checkSentimentHealth();
      res.json({ success: true, available: true, ...health });
    } catch (error) {
      if (error instanceof SentimentServiceError) {
        return res.status(503).json({
          success: false,
          available: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}
