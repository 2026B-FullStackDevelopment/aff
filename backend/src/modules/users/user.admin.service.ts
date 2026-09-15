// Contains Admin account-directory and account-status business rules.
import * as userDirectoryRepository from './user.directory.repository.js';
import * as userAccountRepository from './user.account.repository.js';
import { securityInterface } from '../security/security.interface.js';
import { toUserResponseDto, toDonorResponseDto } from './user.dto.js';
import type { AdminUsersQuery } from './user.types.js';
import type { AccountStatus } from './user.types.js';

/**
 * Builds the role-appropriate DTOs for one Admin account-directory page (G1).
 * The repository supplies the joined role profiles, keeping this mapping free
 * of per-row database calls.
 */
async function listUsersForAdmin(query: AdminUsersQuery) {
  const page = await userDirectoryRepository.findUsersForAdmin(query);

  return {
    ...page,
    items: page.items.map((user) => {
      if (user.role === 'RECIPIENT') {
        // G1 only needs shared account fields for Recipient rows. Premium tier
        // remains subscription-owned and is resolved only for Recipient profile
        // responses, rather than adding one subscription lookup per table row.
        return toUserResponseDto(user)!;
      }

      if (user.role === 'DONOR') {
        return toDonorResponseDto(user, user.donorProfile ?? {});
      }

      if (user.role === 'COURIER') {
        return {
          ...toUserResponseDto(user)!,
          fullName: user.courierProfile?.fullName ?? '',
        };
      }

      return toUserResponseDto(user)!;
    }),
  };
}

/**
 * Changes an account's persisted status for the Admin module.
 *
 * A deactivated account is rejected by the login service on its next sign-in,
 * and every currently recorded session is revoked immediately through the
 * Security module's public interface. Reactivation never restores old tokens;
 * the user must sign in again to receive a fresh session.
 *
 * @throws {Error} `404` when the target account does not exist.
 */
async function updateAccountStatusForAdmin(userId: string, status: AccountStatus) {
  const user = await userAccountRepository.updateAccountStatus(userId, status);

  if (!user) {
    const error: Error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (status === 'DEACTIVATED') {
    await securityInterface.revokeAllTokensForUser(userId, 'ADMIN_DEACTIVATE');
  }

  return toUserResponseDto(user)!;
}

export { listUsersForAdmin, updateAccountStatusForAdmin };
