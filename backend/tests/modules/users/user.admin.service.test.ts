import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findUsersForAdminMock,
  updateAccountStatusMock,
  revokeAllTokensForUserMock,
} = vi.hoisted(() => ({
  findUsersForAdminMock: vi.fn(),
  updateAccountStatusMock: vi.fn(),
  revokeAllTokensForUserMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.directory.repository.js', () => ({
  findUsersForAdmin: findUsersForAdminMock,
}));

vi.mock('../../../src/modules/users/user.account.repository.js', () => ({
  updateAccountStatus: updateAccountStatusMock,
}));

vi.mock('../../../src/modules/security/security.interface.js', () => ({
  securityInterface: {
    revokeAllTokensForUser: revokeAllTokensForUserMock,
  },
}));

import {
  listUsersForAdmin,
  updateAccountStatusForAdmin,
} from '../../../src/modules/users/user.admin.service.js';

describe('user.admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsersForAdmin', () => {
    it('maps a mixed account page to role-appropriate response DTOs', async () => {
      const createdAt = new Date('2026-09-13T00:00:00.000Z');
      findUsersForAdminMock.mockResolvedValue({
        page: 1,
        limit: 20,
        total: 2,
        items: [
          {
            _id: 'admin-1',
            username: 'admin',
            email: 'admin@aff.com',
            role: 'ADMIN',
            status: 'ACTIVE',
            avatarUrl: null,
            createdAt,
          },
          {
            _id: 'courier-1',
            username: 'courier_01',
            email: 'courier@aff.com',
            role: 'COURIER',
            status: 'ACTIVE',
            avatarUrl: null,
            createdAt,
            courierProfile: { fullName: 'Nguyen Van A' },
          },
        ],
      });

      const result = await listUsersForAdmin({ page: 1, limit: 20 });

      expect(findUsersForAdminMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        items: [
          { id: 'admin-1', role: 'ADMIN', username: 'admin' },
          { id: 'courier-1', role: 'COURIER', fullName: 'Nguyen Van A' },
        ],
      });
    });
  });

  describe('updateAccountStatusForAdmin', () => {
    it('revokes every recorded session when an account is deactivated', async () => {
      updateAccountStatusMock.mockResolvedValue({
        _id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'RECIPIENT',
        status: 'DEACTIVATED',
        avatarUrl: null,
        createdAt: new Date('2026-09-15T00:00:00.000Z'),
      });

      const result = await updateAccountStatusForAdmin('u1', 'DEACTIVATED');

      expect(updateAccountStatusMock).toHaveBeenCalledWith('u1', 'DEACTIVATED');
      expect(revokeAllTokensForUserMock).toHaveBeenCalledWith(
        'u1',
        'ADMIN_DEACTIVATE',
      );
      expect(result).toMatchObject({ id: 'u1', status: 'DEACTIVATED' });
    });

    it('does not restore or revoke old sessions when an account is reactivated', async () => {
      updateAccountStatusMock.mockResolvedValue({
        _id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'RECIPIENT',
        status: 'ACTIVE',
        avatarUrl: null,
        createdAt: new Date('2026-09-15T00:00:00.000Z'),
      });

      await updateAccountStatusForAdmin('u1', 'ACTIVE');

      expect(revokeAllTokensForUserMock).not.toHaveBeenCalled();
    });

    it('throws 404 when the account no longer exists', async () => {
      updateAccountStatusMock.mockResolvedValue(null);

      await expect(updateAccountStatusForAdmin('missing', 'ACTIVE')).rejects.toMatchObject({
        message: 'User not found.',
        statusCode: 404,
      });
      expect(revokeAllTokensForUserMock).not.toHaveBeenCalled();
    });
  });
});
