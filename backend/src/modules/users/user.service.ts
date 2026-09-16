// Re-exports the users module's services so the module keeps one public entry point.
// The logic lives in user.account.service, user.profile.service, recipient.service,
// donor.service, courier.service, and user.admin.service; each is small enough to
// read on its own.
export {
  createUser,
  findUserByEmail,
  getUserById,
  deleteUser,
  updateLoginState,
  recordFailedLogin,
  lockAccount,
} from './user.account.service.js';
export { getMyProfileDto, updateUserProfile, changePassword, changeEmail } from './user.profile.service.js';
export {
  createRecipientProfile,
  findRecipientByUserId,
  searchRecipientsByEmail,
  setRecipientStripeCustomerId,
  findRecipientByStripeCustomerId,
  setRecipientTier,
} from './recipient.service.js';
export {
  createDonorProfile,
  findDonorsByUserIds,
  getDonorByUserId,
  findDonorIdsMatchingSearch,
} from './donor.service.js';
export { createCourierAccount, findCourierProfilesByUserIds, listCouriers } from './courier.service.js';
export { listUsersForAdmin, updateAccountStatusForAdmin } from './user.admin.service.js';
export type {
  CreateCourierAccountInput,
  CourierAccount,
  CourierAccountSummary,
  CourierAccountPage,
} from './user.types.js';
export type { CreateDonorProfileInput } from './donor.types.js';
