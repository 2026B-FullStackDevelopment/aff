import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService } from '../services/reservation.service';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { ListingDetailDTO, PaymentMethod } from '@/types/api';
import type { LocationData } from '@/shared/components/AddressAutocomplete/AddressAutocomplete';

interface UseReservationCheckoutResult {
  deliveryAddressText: string;
  addressError: string | null;
  setDeliveryAddressInput: (value: string) => void;
  setDeliveryLocation: (data: LocationData) => void;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  isSubmitting: boolean;
  submitError: string | null;
  submit: () => Promise<void>;
}

export function useReservationCheckout(
  listing: ListingDetailDTO,
  quantity: number,
  reloadListing: () => void,
): UseReservationCheckoutResult {
  const navigate = useNavigate();
  const isFree = listing.price === 0;

  const [addressInput, setAddressInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Stripe defaults selected for priced items (the common path); Cash is
  // shown pre-selected for free items purely for visual parity — it's
  // never actually sent, since paymentMethod is omitted when price is 0.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    isFree ? 'CASH' : 'STRIPE',
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setDeliveryAddressInput(value: string) {
    setAddressInput(value);
    setSelectedLocation(null); // typing invalidates a previously picked suggestion
    if (addressError) setAddressError(null);
  }

  function setDeliveryLocation(data: LocationData) {
    setSelectedLocation(data);
    setAddressInput(data.addressText);
    setAddressError(null);
  }

  async function submit() {
    if (!selectedLocation) {
      setAddressError('Select a delivery address from the suggestions.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const reserveResponse = await reservationService.reserveListing(listing.id, {
        quantity,
        deliveryAddressText: selectedLocation.addressText,
        deliveryLocation: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
        ...(isFree ? {} : { paymentMethod: paymentMethod as PaymentMethod }),
      });

      if (!reserveResponse.ok || !reserveResponse.data) {
        const message = getResponseMessage(reserveResponse.data, 'Could not complete your reservation. Please try again.');
        setSubmitError(message);
        reloadListing();
        return;
      }

      const order = reserveResponse.data;

      if (!isFree && paymentMethod === 'STRIPE') {
        const checkoutResponse = await reservationService.createCheckoutSession(order.id);

        if (!checkoutResponse.ok || !checkoutResponse.data) {
          const message = getResponseMessage(checkoutResponse.data, 'Could not start checkout. Please try again.');
          setSubmitError(message);
          return;
        }

        // Stripe Checkout is a hosted page — full redirect, not a router nav.
        // order.service.ts#createCheckoutSession already sets success_url to
        // `${FRONTEND_URL}/orders/${order.id}?payment=success`, so the
        // Recipient lands back on this order's tracking page after paying.
        // Confirmation itself arrives async via the payment:success socket
        // event (see useOrderPaymentNotifications), not from this redirect.
        window.location.href = checkoutResponse.data.checkoutUrl;
        return;
      }

      // Free and cash reservations already have a Delivery created
      // immediately (see listing.service.ts#reserveListing), so send the
      // Recipient straight to the order/delivery tracking route.
      navigate(`/orders/${order.id}`);
    } catch {
      setSubmitError('Could not complete your reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    deliveryAddressText: addressInput,
    addressError,
    setDeliveryAddressInput,
    setDeliveryLocation,
    paymentMethod,
    setPaymentMethod,
    isSubmitting,
    submitError,
    submit,
  };
}
