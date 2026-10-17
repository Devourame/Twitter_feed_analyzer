import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

// Get paginated users
router.get('/', UserController.getUsers);

// Get user by handle
router.get('/:handle', UserController.getUserByHandle);

export default router;
