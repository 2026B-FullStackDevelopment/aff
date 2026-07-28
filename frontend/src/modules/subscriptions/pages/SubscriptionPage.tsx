// Subscription page screen where recipients can start premium membership.
import { Button } from '../../../shared/components/Button/Button.jsx';
import { subscriptionService } from '../services/subscription.service.js';

export function SubscriptionPage() {
  function handleSubscribe() {
    subscriptionService.startPremiumSubscription({ plan: 'premium-monthly' });
  }

  return (
    <main>
      <h1>Premium Subscription</h1>
      <p>Premium recipients can receive faster alerts for matching food listings.</p>
      <Button onClick={handleSubscribe}>Start Premium</Button>
    </main>
  );
}
