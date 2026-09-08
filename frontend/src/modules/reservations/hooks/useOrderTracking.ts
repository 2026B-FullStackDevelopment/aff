import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/components/ui/sonner';
import { getResponseMessage } from '@/shared/utils/apiError';
import { reservationService } from '../services/reservation.service';
import { useOrderRealtime } from './useOrderRealtime';
import { useDeliveryTracking } from './useDeliveryTracking';
import type { OrderDTO, RefundStatus } from '@/types/api';

export function useOrderTracking(orderId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const deliveryTracking = useDeliveryTracking(orderId, order?.delivery ?? null);
  const [refundStatus, setRefundStatus] = useState<RefundStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // D7 — feedback submission state, separate from the cancel/retry action
  // error above so the two flows never clobber each other's messages.
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

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

  const handleRefunded = useCallback(() => {
    setRefundStatus('REFUND_PENDING' as RefundStatus extends never ? never : 'REFUND_PENDING');
    // Flip local state to REFUNDED without a refetch, matching how
    // payment:success flips paymentStatus live elsewhere in this hook.
    setOrder((prev) =>
      prev ? { ...prev, paymentStatus: 'REFUNDED' } : prev,
    );
    setRefundStatus('REFUNDED' as unknown as RefundStatus);
  }, []);

  useOrderRealtime(orderId, {
    onPaymentSuccess: reload,
    onPaymentRefunded: handleRefunded,
    onStageChanged: deliveryTracking.handleStageChanged,
    onLocationUpdate: deliveryTracking.handleLocationUpdate,
    onDelivered: deliveryTracking.handleDelivered,
  });

  const paymentWasCancelled = searchParams.get('payment') === 'cancelled';
  const paymentSucceeded = searchParams.get('payment') === 'success';

  const isAwaitingPayment = Boolean(
    order &&
    order.paymentMethod === 'STRIPE' &&
    order.paymentStatus === 'PAYMENT_PENDING' &&
    order.orderStatus === 'PENDING_PAYMENT',
  );

  // Eligible iff there's no Delivery yet, or it hasn't been claimed by a
  // Courier yet — orderStatus stays PREPARING through claim/pickup, so it
  // is deliberately not used here (see docs/api_design.md §9).
  const canCancelOrder = Boolean(
    order &&
    order.orderStatus !== 'CANCELLED' &&
    (!order.delivery || order.delivery.stage === 'AWAITING_COURIER'),
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

      const { refundStatus: newRefundStatus, ...updatedOrder } = response.data;
      setOrder(updatedOrder);
      setRefundStatus(newRefundStatus);

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

  /**
   * D7 — submits feedback for this (already-DELIVERED) order.
   * On success, patches `order.feedback` from the response directly —
   * no refetch, matching the response's documented `201` shape.
   * On a 409, distinguishes "already submitted" (the error body echoes
   * the existing feedback per `error.dto.ts#toErrorDto` — use it to
   * self-correct the read-only view immediately) from "not yet
   * delivered" (generic message; shouldn't normally be reachable since
   * `OrderFeedbackSection` already gates on `DELIVERED`, but the server
   * rejection is handled gracefully regardless).
   */
  async function submitFeedback(comment: string) {
    if (!order) return;
    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const response = await reservationService.submitFeedback(order.id, comment);

      if (response.status === 409) {
        const echoedFeedback = (
          response.data as unknown as {
            feedback?: { comment: string; createdAt: string };
          } | null
        )?.feedback;

        if (echoedFeedback) {
          setOrder((prev) => (prev ? { ...prev, feedback: echoedFeedback } : prev));
        } else {
          setFeedbackError(
            getResponseMessage(response.data, "This order hasn't been delivered yet."),
          );
        }
        return;
      }

      if (!response.ok || !response.data) {
        setFeedbackError(
          getResponseMessage(response.data, 'Could not submit feedback. Please try again.'),
        );
        return;
      }

      setOrder((prev) => (prev ? { ...prev, feedback: response.data!.feedback } : prev));
    } catch {
      setFeedbackError('Could not submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  return {
    order, refundStatus, isLoading, isNotFound, error,
    paymentWasCancelled, paymentSucceeded, isAwaitingPayment, canCancelOrder,
    isRetrying, isCancelling, actionError,
    retryPayment, cancelOrder, reload,
    isSubmittingFeedback, feedbackError, submitFeedback,
    stage: deliveryTracking.stage,
    courierPosition: deliveryTracking.courierPosition,
    deliveredAt: deliveryTracking.deliveredAt,
  };
}
