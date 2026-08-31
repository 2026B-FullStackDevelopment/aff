import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/components/ui/sonner';
import { reservationService } from '../services/reservation.service';
import { useOrderPaymentNotifications } from './useOrderPaymentNotifications';
import type { OrderDTO } from '@/types/api';

export function useOrderTracking(orderId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsNotFound(false);
    setError(null);

    async function load() {
      try {
        const response = await reservationService.getOrderById(orderId as string);
        if (!isMounted) return;

        if (response.status === 404 || !response.data) {
          setIsNotFound(true);
        } else if (!response.ok) {
          setError('Could not load this order. Please try again.');
        } else {
          setOrder(response.data);
        }
      } catch {
        if (isMounted) setError('Could not load this order. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [orderId, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useOrderPaymentNotifications(orderId, reload);

  const paymentWasCancelled = searchParams.get('payment') === 'cancelled';

  const isAwaitingPayment = Boolean(
    order &&
    order.paymentMethod === 'STRIPE' &&
    order.paymentStatus === 'PAYMENT_PENDING' &&
    order.orderStatus === 'PENDING_PAYMENT',
  );

  async function retryPayment() {
    if (!order) return;
    setIsRetrying(true);
    setActionError(null);

    try {
      const response = await reservationService.createCheckoutSession(order.id);
      if (!response.ok || !response.data) {
        setActionError('Could not start checkout. Please try again.');
        setIsRetrying(false);
        return;
      }
      // Hosted redirect — leaves the app, same as the original checkout.
      window.location.href = response.data.checkoutUrl;
    } catch {
      setActionError('Could not start checkout. Please try again.');
      setIsRetrying(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    setIsCancelling(true);
    setActionError(null);

    try {
      const response = await reservationService.cancelOrder(order.id);

      // A courier claimed this order between page load and the cancel
      if (response.status === 409) {
        toast.error('This order can no longer be cancelled', {
          description: 'A courier already picked this up before your cancellation went through.',
        });
        setIsCancelling(false);
        reload();
        return;
      }

      if (!response.ok || !response.data) {
        const errMsg = 'Could not cancel this order. Please try again.';
        setActionError(errMsg);
        toast.error(errMsg);
        setIsCancelling(false);
        return;
      }

      setOrder(response.data);
      toast.success('Order cancelled', {
        description: 'Your hold on this item has been released.',
      });
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('payment');
        return next;
      }, { replace: true });
    } catch {
      const errMsg = 'Could not cancel this order. Please try again.';
      setActionError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsCancelling(false);
    }
  }

  return {
    order, isLoading, isNotFound, error,
    paymentWasCancelled, isAwaitingPayment,
    isRetrying, isCancelling, actionError,
    retryPayment, cancelOrder, reload
  };
}
