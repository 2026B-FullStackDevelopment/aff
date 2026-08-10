import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMailMock = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

import { sendEmail } from '../../../src/integrations/email/email.provider.js';

describe('sendEmail', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
  });

  it('sends the message via the SMTP transporter and returns accepted recipients', async () => {
    sendMailMock.mockResolvedValue({ accepted: ['recipient@example.com'], messageId: 'abc-123' });

    const result = await sendEmail({
      to: 'recipient@example.com',
      subject: 'Welcome',
      text: 'Hello there',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        subject: 'Welcome',
        text: 'Hello there',
      })
    );
    expect(result).toEqual({
      provider: 'nodemailer',
      accepted: ['recipient@example.com'],
      messageId: 'abc-123',
    });
  });

  it('rejects when no recipient is provided', async () => {
    await expect(
      sendEmail({ subject: 'No recipient', text: 'Body' } as Parameters<typeof sendEmail>[0])
    ).rejects.toThrow(/to/i);
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
