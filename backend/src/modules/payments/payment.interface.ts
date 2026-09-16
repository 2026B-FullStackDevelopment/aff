// Exposes safe payment operations for other modules without importing payment's split services directly.
import * as paymentCustomerService from './payment.customer.service.js';
import * as paymentCheckoutService from './payment.checkout.service.js';
import * as paymentRefundService from './payment.refund.service.js';

const paymentInterface = {
  getOrCreateStripeCustomer: paymentCustomerService.getOrCreateStripeCustomer,
  startOneTimeCheckout: paymentCheckoutService.startOneTimeCheckout,
  startSubscriptionCheckout: paymentCheckoutService.startSubscriptionCheckout,
  setSubscriptionCancelAtPeriodEnd: paymentCheckoutService.setSubscriptionCancelAtPeriodEnd,
  refundOrderPayment: paymentRefundService.refundOrderPayment,
  cancelPendingOrderPayment: paymentRefundService.cancelPendingOrderPayment,
};

export { paymentInterface };
