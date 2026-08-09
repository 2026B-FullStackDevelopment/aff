// Wraps future payment providers for premium subscriptions.
async function createPaymentIntent(subscriptionRequest) {
  return {
    provider: 'placeholder-payment-provider',
    clientSecret: `demo_${subscriptionRequest.plan || 'premium'}`,
  };
}

export { createPaymentIntent };
