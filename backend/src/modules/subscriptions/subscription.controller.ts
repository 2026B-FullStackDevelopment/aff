// Handles subscription HTTP requests and returns subscription DTOs.
import type { Request, Response, NextFunction } from 'express';
import * as subscriptionQueryService from './subscription.query.service.js';
import * as subscriptionCheckoutService from './subscription.checkout.service.js';
import * as subscriptionLifecycleService from './subscription.lifecycle.service.js';
import { ok } from '../../shared/http/response.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import { updateSubscriptionSchema } from './subscription.schemas.js';

async function getMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    return ok(res, await subscriptionQueryService.getMySubscriptionStatus(req.user!.id));
  } catch (error) {
    return next(error);
  }
}

async function createSubscriptionCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    return ok(res, await subscriptionCheckoutService.startCheckout(req.user!.id));
  } catch (error) {
    return next(error);
  }
}

async function updateMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { cancelAtPeriodEnd } = parseBody(updateSubscriptionSchema, req.body);

    const subscription = cancelAtPeriodEnd
      ? await subscriptionLifecycleService.cancelMySubscription(req.user!.id)
      : await subscriptionLifecycleService.resumeMySubscription(req.user!.id);

    return ok(res, { subscription });
  } catch (error) {
    return next(error);
  }
}

export { getMySubscription, createSubscriptionCheckoutSession, updateMySubscription };
