import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startSessionMock, withTransactionMock, endSessionMock } = vi.hoisted(
  () => ({
    startSessionMock: vi.fn(),
    withTransactionMock: vi.fn(),
    endSessionMock: vi.fn(),
  }),
);

vi.mock('mongoose', () => ({
  default: {
    startSession: startSessionMock,
  },
}));

import { withTransaction } from '../../../src/modules/listings/listing.transaction.repository.js';

describe('listing.transaction.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSessionMock.mockResolvedValue({
      withTransaction: withTransactionMock,
      endSession: endSessionMock,
    });
    withTransactionMock.mockImplementation(async (operation) => operation());
  });

  it('returns the operation result and closes the session', async () => {
    const operation = vi.fn().mockResolvedValue({ listingId: 'l1' });

    await expect(withTransaction(operation)).resolves.toEqual({
      listingId: 'l1',
    });

    expect(operation).toHaveBeenCalledWith(
      expect.objectContaining({ withTransaction: withTransactionMock }),
    );
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('closes the session when the transaction fails', async () => {
    const failure = new Error('transaction failed');
    withTransactionMock.mockRejectedValue(failure);

    await expect(withTransaction(vi.fn())).rejects.toThrow(failure);
    expect(endSessionMock).toHaveBeenCalledOnce();
  });
});
