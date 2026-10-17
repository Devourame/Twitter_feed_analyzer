import { Request, Response, NextFunction } from 'express';

/**
 * Validate ObjectId parameters
 */
export const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  // This is for MongoDB _id parameters if we ever use them directly
  // For our tweetId (string) we don't need this, but keeping for completeness
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page parameter must be >= 1'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit parameter must be between 1 and 100'
    });
  }

  next();
};

/**
 * Validate date parameters
 */
export const validateDateParams = (req: Request, res: Response, next: NextFunction) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  if (startDate && isNaN(Date.parse(startDate))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid startDate format. Use ISO format (YYYY-MM-DD)'
    });
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid endDate format. Use ISO format (YYYY-MM-DD)'
    });
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      success: false,
      message: 'startDate must be before or equal to endDate'
    });
  }

  next();
};

/**
 * Validate sentiment parameter
 */
export const validateSentiment = (req: Request, res: Response, next: NextFunction) => {
  const sentiment = req.query.sentiment as string;

  if (sentiment && !['positive', 'neutral', 'negative'].includes(sentiment.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Sentiment must be one of: positive, neutral, negative'
    });
  }

  next();
};