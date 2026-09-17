// Subscription status and billing shapes.
// Corresponds to API Design §10 (Subscriptions Module).

export interface SubscriptionDTO {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionStatusResponse {
  tier: 'STANDARD' | 'PREMIUM';
  subscription: SubscriptionDTO | null;
}

export interface UpdateSubscriptionResponse {
  subscription: SubscriptionDTO;
}
