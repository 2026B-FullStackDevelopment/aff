import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    leanMock,
  };
});

vi.mock('../../../src/modules/users/recipient.model.js', () => ({
  default: { create: createMock, findOne: findOneMock },
}));

import {
  createRecipient,
  findRecipientByUserId,
  findRecipientByStripeCustomerId,
} from '../../../src/modules/users/recipient.repository.js';

describe('recipient.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ userId: 'u1', tier: 'STANDARD' });
  });

  it('createRecipient defaults the tier to STANDARD', async () => {
    createMock.mockResolvedValue({ userId: 'u1', tier: 'STANDARD' });

    const result = await createRecipient({ userId: 'u1' });

    expect(createMock).toHaveBeenCalledWith({ userId: 'u1', tier: 'STANDARD' });
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
});
