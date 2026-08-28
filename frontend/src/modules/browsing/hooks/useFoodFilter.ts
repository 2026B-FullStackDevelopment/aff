// Holds the advanced-filter behavior (city / category / price / sort)
// used by FoodFilterPanel. `updateSearch` from the original version now
// lives directly in FoodFilter.tsx since the search box moved out of the
// panel and into the toolbar next to the "Filters" toggle — see
// FoodListingsPage.tsx for how the two are composed.
//
// City, category, and sort are all single-select against the backend's
// listingsQuerySchema (category is a scalar enum, not an array; sort/order
// are both optional with no "unsorted" enum value). Each behaves like a
// toggle: selecting the currently-active value clears it back to null,
// selecting a different value switches directly to it. This is
// intentionally reused as CheckboxField styling rather than introducing a
// RadioField component — see project deviations notes.
import type { FoodCategory } from '@/types/api';

export interface ListingFilters {
  search: string;
  city: string | null;
  category: FoodCategory | null;
  priceMin: string;
  priceMax: string;
  sortOrder: 'asc' | 'desc' | null;
  page: number;
  limit: number;
}

export const DEFAULT_FILTERS: ListingFilters = {
  search: '',
  city: null,
  category: null,
  priceMin: '',
  priceMax: '',
  sortOrder: null,
  page: 1,
  limit: 6,
};

export function useFoodFilter(filters: ListingFilters, onChange: (patch: Partial<ListingFilters>) => void) {
  function selectCity(city: string) {
    onChange({ city: filters.city === city ? null : city });
  }

  function selectCategory(category: FoodCategory) {
    onChange({ category: filters.category === category ? null : category });
  }

  function setPriceMin(priceMin: string) {
    onChange({ priceMin });
  }

  function setPriceMax(priceMax: string) {
    onChange({ priceMax });
  }

  function setSortOrder(sortOrder: 'asc' | 'desc') {
    onChange({ sortOrder: filters.sortOrder === sortOrder ? null : sortOrder });
  }

  function clearAll() {
    onChange({
      city: null,
      category: null,
      priceMin: '',
      priceMax: '',
      sortOrder: null,
    });
  }

  return { selectCity, selectCategory, setPriceMin, setPriceMax, setSortOrder, clearAll };
}
