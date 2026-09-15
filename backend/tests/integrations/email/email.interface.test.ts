import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));

vi.mock('../../../src/integrations/email/email.provider.js', () => ({
  sendEmail: sendEmailMock,
}));

import { emailInterface } from '../../../src/integrations/email/email.interface.js';

describe('emailInterface.sendSubscriptionConfirmation', () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
  });

  it('sends a confirmation email with a subject and a body containing the formatted renewal date', async () => {
    sendEmailMock.mockResolvedValue({ provider: 'nodemailer', accepted: ['jane@example.com'], messageId: 'm1' });

    await emailInterface.sendSubscriptionConfirmation({
      to: 'jane@example.com',
      currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Your AFF Premium subscription is active',
        text: expect.stringContaining('March 1, 2026'),
      }),
    );
  });

  it('returns the underlying send result', async () => {
    sendEmailMock.mockResolvedValue({ provider: 'nodemailer', accepted: ['jane@example.com'], messageId: 'm1' });

    const result = await emailInterface.sendSubscriptionConfirmation({
      to: 'jane@example.com',
      currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(result).toEqual({ provider: 'nodemailer', accepted: ['jane@example.com'], messageId: 'm1' });
  });
});
