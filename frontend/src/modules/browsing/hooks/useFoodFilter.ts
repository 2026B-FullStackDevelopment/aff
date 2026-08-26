// Holds the advanced-filter behavior (city / category / price / sort)
// used by FoodFilterPanel. `updateSearch` from the original version now
// lives directly in FoodFilter.tsx since the search box moved out of the
// panel and into the toolbar next to the "Filters" toggle — see
// FoodListingsPage.tsx for how the two are composed.
import type { ListingCategory, ListingFilters } from './useFoodListings';

export function useFoodFilter(filters: ListingFilters, onChange: (patch: Partial<ListingFilters>) => void) {
  function selectCity(city: string) {
    onChange({ city: filters.city === city ? null : city });
  }

  function toggleCategory(category: ListingCategory) {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];

    onChange({ categories: next });
  }

  function setPriceMin(priceMin: string) {
    onChange({ priceMin });
  }

  function setPriceMax(priceMax: string) {
    onChange({ priceMax });
  }

  function setSortOrder(sortOrder: 'asc' | 'desc') {
    onChange({ sortOrder });
  }

  function clearAll() {
    onChange({ city: null, categories: [], priceMin: '', priceMax: '', sortOrder: 'asc' });
  }

  return { selectCity, toggleCategory, setPriceMin, setPriceMax, setSortOrder, clearAll };
}
