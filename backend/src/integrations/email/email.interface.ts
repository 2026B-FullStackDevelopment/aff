// Exposes transactional email templates for other modules without importing email.provider directly.
import * as emailProvider from './email.provider.js';

/**
 * Sends the Premium subscription confirmation email (F1), fired once per billing cycle after the
 * webhook appends a new SUBSCRIPTION row. Keeps the webhook decoupled from the mail transport, so
 * swapping providers later (PRD §11) is a config change, not a code change at the call site.
 * @param to - the Recipient's email address
 * @param currentPeriodEnd - when the current billing cycle (and Premium access) renews
 */
async function sendSubscriptionConfirmation({ to, currentPeriodEnd }: { to: string; currentPeriodEnd: Date }) {
  // Pinned to UTC so the printed date doesn't shift with the server's local time zone —
  // currentPeriodEnd is stored as a UTC instant derived straight from Stripe's epoch seconds.
  const renewalDate = currentPeriodEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return emailProvider.sendEmail({
    to,
    subject: 'Your AFF Premium subscription is active',
    text: `Thanks for subscribing! Your AFF Premium subscription is now active and renews on ${renewalDate}.`,
  });
}

const emailInterface = { sendSubscriptionConfirmation };

export { emailInterface };
