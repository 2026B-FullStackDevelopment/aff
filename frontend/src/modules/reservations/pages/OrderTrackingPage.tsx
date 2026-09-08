import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Package, Store } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog/ConfirmationDialog';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { Panel } from '@/shared/components/Panel/Panel';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { formatDate, formatPrice, UNIT_LABELS } from '@/shared/utils/listingFormatting';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { OrderFeedbackSection } from '../components/OrderFeedbackSection';

export function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const {
    order, refundStatus, isLoading, isNotFound, error,
    paymentWasCancelled, paymentSucceeded, isAwaitingPayment, canCancelOrder,
    isRetrying, isCancelling, actionError,
    retryPayment, cancelOrder, reload,
    isSubmittingFeedback, feedbackError, submitFeedback,
  } = useOrderTracking(id);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader backTo="/reservations" backLabel="Back to Reservations" />

      <div className="mx-auto max-w-3xl px-6 py-6">
        {isLoading && <LoadingSkeleton count={1} />}

        {!isLoading && isNotFound && (
          <EmptyState
            title="Order not found"
            description="This order may not exist, or may not belong to your account."
          />
        )}

        {!isLoading && !isNotFound && error && (
          <ErrorState message={error} onRetry={reload} />
        )}

        {!isLoading && !isNotFound && !error && order && (
          <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
              Order Tracking
            </h1>

            {paymentWasCancelled && isAwaitingPayment && (
              <WarningCallout title="Payment wasn't completed">
                <p>
                  You left Stripe's checkout before finishing payment. Your order is being
                  held, but it won't move into preparation until payment goes through.
                </p>

                {actionError && (
                  <div className="mt-3">
                    <FormErrorAlert message={actionError} />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void retryPayment()}
                    disabled={isRetrying || isCancelling}
                    className="h-10 rounded-lg bg-[#3D6852] px-4 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
                  >
                    {isRetrying ? 'Redirecting…' : 'Retry Payment'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={isRetrying || isCancelling}
                    className="h-10 rounded-lg border-[#C1C8C2] px-4 text-sm font-semibold text-[#414844] transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
                  >
                    Cancel This Order
                  </Button>
                </div>
              </WarningCallout>
            )}

            {/* Edge case: recipient completed Stripe checkout on a tab that was still
                open after they'd already cancelled the order elsewhere. The order is
                correctly CANCELLED either way — this just tells them what happened
                and to reach out if money was actually taken. */}
            {paymentSucceeded && order.orderStatus === 'CANCELLED' && (
              <WarningCallout title="This order was already cancelled">
                <p>
                  It looks like you completed payment after this order had already been cancelled.
                  No delivery will be created for it. If you were charged, please contact support
                  and we'll help sort out a refund.
                </p>
              </WarningCallout>
            )} 

            {order.orderStatus === 'CANCELLED' && (
              <WarningCallout title="This order was cancelled">
                <p>
                  {order.cancelledByUserId
                    ? 'This order has been cancelled.'
                    : 'This order was automatically cancelled.'}{' '}
                  You're free to reserve this listing again if it's still available.
                </p>
              </WarningCallout>
            )}

            {/* Refund state — only meaningful once the order is cancelled and was Stripe-paid.
                NOT_APPLICABLE (free/cash/never-paid) needs no callout at all. */}
            {refundStatus === 'REFUND_PENDING' && (
              <WarningCallout title="Refund in progress">
                <p>
                  Your payment refund has started and is being processed by Stripe. This can
                  take a few business days to appear on your statement — we'll update this page
                  automatically once it's confirmed.
                </p>
              </WarningCallout>
            )}

            {refundStatus === 'FAILED' && (
              <WarningCallout title="Refund needs attention">
                <p>
                  Your order is cancelled, but we weren't able to start the refund automatically.
                  This needs manual follow-up — please contact support so we can sort out your
                  refund.
                </p>
              </WarningCallout>
            )}

            <Panel title="Order Details">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Package className="size-4" aria-hidden="true" />
                    Order Status
                  </span>
                  <StatusBadge status={order.orderStatus} />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">Payment Status</span>
                  <StatusBadge status={order.paymentStatus} />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Store className="size-4" aria-hidden="true" />
                    Item
                  </span>
                  <span className="font-semibold text-[#414844]">
                    {order?.listing?.name ?? 'Listing'} × {order.quantity}
                    {order.listing.unit ? ` ${UNIT_LABELS[order.listing.unit] ?? ''}` : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-[#1B1C1C]">{formatPrice(order.amount)}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="size-4" aria-hidden="true" />
                    Placed
                  </span>
                  <span className="text-[#414844]">{formatDate(order.createdAt)}</span>
                </div>

                <div className="pt-1 text-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Delivery Address
                  </p>
                  <p className="text-[#414844]">{order.deliveryAddressText}</p>
                </div>

                {canCancelOrder && (
                  <div className="flex flex-col items-end gap-3 border-t border-slate-100 pt-4">
                    {actionError && <FormErrorAlert message={actionError} />}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCancelDialogOpen(true)}
                      disabled={isCancelling}
                      className="h-10 rounded-lg border-red-200 px-4 text-sm font-semibold text-red-700 transition-all duration-200 ease-out hover:bg-red-50 hover:shadow-md active:scale-[0.98]"
                    >
                      Cancel Order
                    </Button>
                  </div>
                )}
              </div>
            </Panel>

            {/* D7 — one-shot feedback, only meaningful once DELIVERED.
                Renders nothing until then; read-only once submitted. */}
            <div id="order-feedback-section">
              <OrderFeedbackSection
                order={order}
                isSubmitting={isSubmittingFeedback}
                error={feedbackError}
                onSubmit={submitFeedback}
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={isCancelDialogOpen}
        title="Cancel this order?"
        description="This will release your hold on this item so someone else can reserve it. You can always come back and reserve it again if it's still available."
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        tone="danger"
        isPending={isCancelling}
        onConfirm={async () => {
          await cancelOrder();
          setIsCancelDialogOpen(false);
        }}
        onClose={() => setIsCancelDialogOpen(false)}
      />
    </div>
  );
}

export default OrderTrackingPage;
