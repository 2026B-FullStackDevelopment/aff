import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, updateOneMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    updateOneMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/users/recipient.model.js', () => ({
  default: { create: createMock, findOne: findOneMock, updateOne: updateOneMock },
}));

import {
  createRecipient,
  findRecipientByUserId,
  findRecipientByStripeCustomerId,
  setRecipientTierIfChanged,
} from '../../../src/modules/users/recipient.repository.js';

describe('recipient.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    updateOneMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ userId: 'u1', tier: 'STANDARD' });
  });

  // The STANDARD default now comes from the schema, not from this call site — passing it here
  // too would be a second place to keep in sync.
  it('createRecipient writes only the userId and leaves tier to the schema default', async () => {
    createMock.mockResolvedValue({ userId: 'u1', tier: 'STANDARD' });

    const result = await createRecipient({ userId: 'u1' });

    expect(createMock).toHaveBeenCalledWith({ userId: 'u1' });
    expect(result).toEqual({ userId: 'u1', tier: 'STANDARD' });
  });

  it('findRecipientByUserId queries by userId and returns a lean document', async () => {
    await findRecipientByUserId('u1');

    expect(findOneMock).toHaveBeenCalledWith({ userId: 'u1' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('findRecipientByStripeCustomerId queries by stripeCustomerId and returns a lean document', async () => {
    await findRecipientByStripeCustomerId('cus_123');

    expect(findOneMock).toHaveBeenCalledWith({ stripeCustomerId: 'cus_123' });
    expect(leanMock).toHaveBeenCalled();
  });

  describe('setRecipientTierIfChanged', () => {
    // The $ne filter is the whole point: it makes an already-correct row match nothing, so the
    // read-repair call on GET /subscriptions/me costs a no-op update instead of a write per request.
    it('filters on a differing tier so an in-sync row is not rewritten', async () => {
      updateOneMock.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      await setRecipientTierIfChanged('u1', 'PREMIUM');

      expect(updateOneMock).toHaveBeenCalledWith(
        { userId: 'u1', tier: { $ne: 'PREMIUM' } },
        { $set: { tier: 'PREMIUM' } },
      );
    });

    it('writes STANDARD the same way', async () => {
      updateOneMock.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await setRecipientTierIfChanged('u1', 'STANDARD');

      expect(updateOneMock).toHaveBeenCalledWith(
        { userId: 'u1', tier: { $ne: 'STANDARD' } },
        { $set: { tier: 'STANDARD' } },
      );
    });
  });
});
