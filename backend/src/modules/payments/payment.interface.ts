// Exposes safe payment operations for other modules without importing payments.service directly.
import * as paymentsService from './payments.service.js';

const paymentInterface = {
  getOrCreateStripeCustomer: paymentsService.getOrCreateStripeCustomer,
  startOneTimeCheckout: paymentsService.startOneTimeCheckout,
  startSubscriptionCheckout: paymentsService.startSubscriptionCheckout,
  refundOrderPayment: paymentsService.refundOrderPayment,
};

export { paymentInterface };
