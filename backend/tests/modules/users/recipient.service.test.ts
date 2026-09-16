import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createRecipientMock,
  findRecipientByStripeCustomerIdMock,
  setRecipientTierIfChangedMock,
  searchActiveRecipientsByEmailMock,
} = vi.hoisted(() => ({
  createRecipientMock: vi.fn(),
  findRecipientByStripeCustomerIdMock: vi.fn(),
  setRecipientTierIfChangedMock: vi.fn(),
  searchActiveRecipientsByEmailMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/recipient.repository.js', () => ({
  createRecipient: createRecipientMock,
  findRecipientByStripeCustomerId: findRecipientByStripeCustomerIdMock,
  setRecipientTierIfChanged: setRecipientTierIfChangedMock,
}));

vi.mock('../../../src/modules/users/user.directory.repository.js', () => ({
  searchActiveRecipientsByEmail: searchActiveRecipientsByEmailMock,
}));

import {
  createRecipientProfile,
  searchRecipientsByEmail,
  findRecipientByStripeCustomerId,
  setRecipientTier,
} from '../../../src/modules/users/recipient.service.js';

describe('recipient.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchRecipientsByEmail', () => {
    it('normalizes a useful email prefix and limits results to ten', async () => {
      searchActiveRecipientsByEmailMock.mockResolvedValue([
        { _id: 'r1', email: 'recipient@example.com' },
      ]);

      const result = await searchRecipientsByEmail('  RECIPIENT@  ');

      expect(searchActiveRecipientsByEmailMock).toHaveBeenCalledWith(
        'recipient@',
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('does not query the database for fewer than three characters', async () => {
      await expect(searchRecipientsByEmail('re')).resolves.toEqual([]);
      expect(searchActiveRecipientsByEmailMock).not.toHaveBeenCalled();
    });
  });

  it('createRecipientProfile delegates to the recipient repository', async () => {
    createRecipientMock.mockResolvedValue({ userId: 'u1' });

    await createRecipientProfile('u1');

    expect(createRecipientMock).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('findRecipientByStripeCustomerId delegates to the recipient repository', async () => {
    findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: 'cus_123' });

    const result = await findRecipientByStripeCustomerId('cus_123');

    expect(findRecipientByStripeCustomerIdMock).toHaveBeenCalledWith('cus_123');
    expect(result).toEqual({ userId: 'u1', stripeCustomerId: 'cus_123' });
  });

  it('setRecipientTier delegates to the change-guarded repository setter', async () => {
    setRecipientTierIfChangedMock.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    await setRecipientTier('u1', 'PREMIUM');

    expect(setRecipientTierIfChangedMock).toHaveBeenCalledWith('u1', 'PREMIUM');
  });
});
