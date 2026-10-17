import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

/**
 * Controller for user-related operations
 */
export class UserController {
  /**
   * Get paginated list of users
   * Query params:
   *   page: page number (default: 1)
   *   limit: items per page (default: 20)
   *   search: case-insensitive partial match on handle or displayName
   */
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
      const skip = (page - 1) * limit;

      // Optional search filter on handle or displayName (case-insensitive).
      // Regex special characters are escaped so user input is treated literally.
      const filter: any = {};
      if (req.query.search) {
        const escaped = req.query.search
          .toString()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        filter.$or = [{ handle: pattern }, { displayName: pattern }];
      }

      const [users, totalCount] = await Promise.all([
        User.find(filter)
          .sort({ followersCount: -1 }) // Show most influential first
          .skip(skip)
          .limit(limit)
          .select('-__v'), // Exclude version key
        User.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single user by handle
   */
  static async getUserByHandle(req: Request, res: Response, next: NextFunction) {
    try {
      const handle = req.params.handle.toString().toLowerCase();
      const user = await User.findOne({ handle });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
