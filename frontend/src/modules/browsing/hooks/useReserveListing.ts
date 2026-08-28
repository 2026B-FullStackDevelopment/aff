// Quantity + reserve submission for the Listing Detail page's purchase
// card. Deliberately simpler than useFoodCard.ts (marketplace grid): the
// mock shows the stepper and Reserve button open at all times here, with
// no expand/collapse step.
//
// TODO: same real gap flagged in useFoodCard.ts — POST
// /listings/:id/reserve (api_design.md §6) also needs
// deliveryAddressText / deliveryLocation / paymentMethod, which belong to
// a checkout step this page doesn't own yet. mockReserve stands in until
// that's built.
import { useState } from 'react';
import type { ListingDetailDTO } from '@/types/api';

function mockReserve(_listingId: string, _quantity: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });
}

export function useReserveListing(listing: ListingDetailDTO) {
  const [quantity, setQuantityState] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const maxQuantity = listing.rationLimitPerPerson
    ? Math.min(listing.quantityRemaining, listing.rationLimitPerPerson)
    : listing.quantityRemaining;

  function setQuantity(next: number) {
    setQuantityState(Math.min(maxQuantity, Math.max(1, next)));
  }

  async function reserve() {
    setIsSubmitting(true);
    setError(null);

    try {
      await mockReserve(listing.id, quantity);
      setSucceeded(true);
    } catch {
      setError('Could not reserve this item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return { quantity, setQuantity, maxQuantity, isSubmitting, error, succeeded, reserve };
}
