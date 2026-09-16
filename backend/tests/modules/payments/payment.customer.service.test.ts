import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createStripeCustomerMock,
  findRecipientByUserIdMock,
  getUserByIdMock,
  setRecipientStripeCustomerIdMock,
} = vi.hoisted(() => ({
  createStripeCustomerMock: vi.fn(),
  findRecipientByUserIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientStripeCustomerIdMock: vi.fn(),
}));

vi.mock('../../../src/integrations/payment/payment.provider.js', () => ({
  createStripeCustomer: createStripeCustomerMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findRecipientByUserId: findRecipientByUserIdMock,
    getUserById: getUserByIdMock,
    setRecipientStripeCustomerId: setRecipientStripeCustomerIdMock,
  },
}));

import { getOrCreateStripeCustomer } from '../../../src/modules/payments/payment.customer.service.js';

describe('payment.customer.service', () => {
  beforeEach(() => {
    createStripeCustomerMock.mockReset();
    findRecipientByUserIdMock.mockReset();
    getUserByIdMock.mockReset();
    setRecipientStripeCustomerIdMock.mockReset();
  });

  describe('getOrCreateStripeCustomer', () => {
    it('returns the existing stripeCustomerId without calling Stripe', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: 'cus_existing' });

      const result = await getOrCreateStripeCustomer('u1');

      expect(result).toBe('cus_existing');
      expect(createStripeCustomerMock).not.toHaveBeenCalled();
    });

    it('throws a 404 when no Recipient profile exists', async () => {
      findRecipientByUserIdMock.mockResolvedValue(null);

      await expect(getOrCreateStripeCustomer('u1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('creates a Stripe customer and persists it when none exists yet', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: null });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockResolvedValue({ provider: 'stripe', customerId: 'cus_new' });

      const result = await getOrCreateStripeCustomer('u1');

      expect(createStripeCustomerMock).toHaveBeenCalledWith({
        email: 'jane@example.com',
        metadata: { userId: 'u1' },
      });
      expect(setRecipientStripeCustomerIdMock).toHaveBeenCalledWith('u1', 'cus_new');
      expect(result).toBe('cus_new');
    });

    it('wraps a Stripe failure as a 502 error', async () => {
      findRecipientByUserIdMock.mockResolvedValue({ userId: 'u1', stripeCustomerId: null });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });
      createStripeCustomerMock.mockRejectedValue(new Error('Stripe is down'));

      await expect(getOrCreateStripeCustomer('u1')).rejects.toMatchObject({ statusCode: 502 });
      expect(setRecipientStripeCustomerIdMock).not.toHaveBeenCalled();
    });
  });
});
