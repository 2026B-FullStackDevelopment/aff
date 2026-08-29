import { useState } from 'react';
import type { ListingDetailDTO } from '@/types/api';

export function useReserveListing(listing: ListingDetailDTO) {
  const [quantity, setQuantityState] = useState(1);

  const maxQuantity = listing.rationLimitPerPerson
    ? Math.min(listing.quantityRemaining, listing.rationLimitPerPerson)
    : listing.quantityRemaining;

  function setQuantity(next: number) {
    setQuantityState(Math.min(maxQuantity, Math.max(1, next)));
  }

  return { quantity, setQuantity, maxQuantity };
}
