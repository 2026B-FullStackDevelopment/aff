// Holds FoodCard behavior so the JSX stays focused on presentation.
//
// DEVIATION NOTE: signature changed from the earlier `useFoodCard(food)`.
// That version called reservationService.createReservation(food.id)
// directly and returned nothing to the caller. This version needs local
// UI state (expand/collapse, quantity, submit/error) because the new
// FoodCard has an inline quantity stepper instead of a single Reserve
// button, and it reports the outcome back up via `onReserved` so
// useFoodListings can update quantityRemaining without an extra fetch.
//
// TODO: `mockCreateReservation` stands in for a real POST
// /listings/:id/reserve call (api_design.md §6). That endpoint also needs
// deliveryAddressText / deliveryLocation / paymentMethod, which belong to
// a checkout step this card intentionally doesn't own yet — flagged
// previously as a real gap between the current UI and the SRS-defined
// endpoint, not papered over here.
import { useState } from 'react';
import type { ListingSummary } from './useFoodListings';

function mockCreateReservation(_listingId: string, _quantity: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });
}

export function useFoodCard(listing: ListingSummary, onReserved: (listingId: string, quantity: number) => void) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQuantity = listing.rationLimitPerPerson
    ? Math.min(listing.quantityRemaining, listing.rationLimitPerPerson)
    : listing.quantityRemaining;

  function expand() {
    setQuantity(1);
    setError(null);
    setIsExpanded(true);
  }

  function cancel() {
    setError(null);
    setIsExpanded(false);
  }

  function setQuantityClamped(next: number) {
    setQuantity(Math.min(maxQuantity, Math.max(1, next)));
  }

  async function confirm() {
    setIsSubmitting(true);
    setError(null);

    try {
      await mockCreateReservation(listing.id, quantity);
      onReserved(listing.id, quantity);
      setIsExpanded(false);
    } catch {
      setError('Could not reserve this item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isExpanded,
    quantity,
    isSubmitting,
    error,
    maxQuantity,
    expand,
    cancel,
    setQuantity: setQuantityClamped,
    confirm,
  };
}
