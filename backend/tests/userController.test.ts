import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { testSetup } from './setup';

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

describe('UserController', () => {
  beforeAll(async () => {
    await testSetup.connect();
  });

  afterAll(async () => {
    await testSetup.disconnect();
  });

  beforeEach(async () => {
    await testSetup.clearCollections();

    await User.create([
      {
        handle: 'tech_guru',
        displayName: 'Alex Tech',
        followersCount: 14500,
        accountCreatedAt: new Date('2024-01-15T00:00:00Z')
      },
      {
        handle: 'gamer_x',
        displayName: 'Sam Play',
        followersCount: 300,
        accountCreatedAt: new Date('2025-06-01T00:00:00Z')
      }
    ]);
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({ page: '1', limit: '10' });
      const res = mockRes();

      await UserController.getUsers(req as any, res as any, mockNext);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(2);
      expect(jsonCall.pagination.total).toBe(2);
    });

    it('should filter users by handle search (case-insensitive)', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({ search: 'TECH' });
      const res = mockRes();

      await UserController.getUsers(req as any, res as any, mockNext);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(1);
      expect(jsonCall.data[0].handle).toBe('tech_guru');
      expect(jsonCall.pagination.total).toBe(1);
    });

    it('should filter users by displayName search', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({ search: 'sam' });
      const res = mockRes();

      await UserController.getUsers(req as any, res as any, mockNext);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(1);
      expect(jsonCall.data[0].displayName).toBe('Sam Play');
    });

    it('should return empty results for no match', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({ search: 'nonexistent' });
      const res = mockRes();

      await UserController.getUsers(req as any, res as any, mockNext);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(0);
      expect(jsonCall.pagination.total).toBe(0);
    });

    it('should treat regex special characters literally', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({ search: '.*' });
      const res = mockRes();

      await UserController.getUsers(req as any, res as any, mockNext);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.length).toBe(0);
    });
  });

  describe('getUserByHandle', () => {
    it('should return a user by handle', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({}, { handle: 'tech_guru' });
      const res = mockRes();

      await UserController.getUserByHandle(req as any, res as any, mockNext);

      expect(res.status).not.toHaveBeenCalledWith(404);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.handle).toBe('tech_guru');
    });

    it('should return 404 for unknown handle', async () => {
      const { UserController } = await import('../src/controllers/userController');

      const req = mockReq({}, { handle: 'ghost_user' });
      const res = mockRes();

      await UserController.getUserByHandle(req as any, res as any, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
