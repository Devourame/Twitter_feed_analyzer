import { get } from './client';
import type { UserListResponse, SingleUserResponse } from '../types/api';

/** GET /api/users — paginated users sorted by followers; optional search. */
export function fetchUsers(
  page = 1,
  limit = 20,
  search?: string,
  signal?: AbortSignal
) {
  return get<UserListResponse>('/api/users', { page, limit, search }, signal);
}

/** GET /api/users/:handle — single user by handle. */
export function fetchUserByHandle(handle: string, signal?: AbortSignal) {
  return get<SingleUserResponse>(`/api/users/${encodeURIComponent(handle)}`, undefined, signal);
}
