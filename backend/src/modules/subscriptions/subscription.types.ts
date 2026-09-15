// Defines internal persistence, repository, and service types for subscriptions.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
interface SubscriptionAttrs {
  recipientId: mongoose.Types.ObjectId; stripeSubscriptionId: string; status: SubscriptionStatus;
  currentPeriodEnd: Date; cancelAtPeriodEnd: boolean; stripeInvoiceId?: string; createdAt: Date;
}
interface SubscriptionDocument extends SubscriptionAttrs, mongoose.Document {}
interface CreateSubscriptionInput {
  recipientId: string | Types.ObjectId; stripeSubscriptionId: string; status: SubscriptionStatus;
  currentPeriodEnd: Date; cancelAtPeriodEnd?: boolean; stripeInvoiceId?: string;
}
interface SetLatestSubscriptionFieldsPatch { status?: SubscriptionStatus; cancelAtPeriodEnd?: boolean }
interface AppendBillingCycleInput {
  stripeCustomerId: string; stripeSubscriptionId: string; stripeInvoiceId: string;
  currentPeriodEnd: Date; cancelAtPeriodEnd: boolean;
}

export type { SubscriptionStatus, SubscriptionAttrs, SubscriptionDocument, CreateSubscriptionInput, SetLatestSubscriptionFieldsPatch, AppendBillingCycleInput };
