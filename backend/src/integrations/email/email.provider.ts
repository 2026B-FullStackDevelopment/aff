// Wraps future email providers so business modules do not depend on a vendor SDK directly.
async function sendEmail(message) {
  return {
    provider: 'placeholder-email-provider',
    accepted: Boolean(message.to),
  };
}

module.exports = { sendEmail };
