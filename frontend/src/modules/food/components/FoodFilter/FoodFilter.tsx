// Presents filters for the food listing page without owning backend API calls.
import { useFoodFilter } from './useFoodFilter.js';
import './FoodFilter.css';

export function FoodFilter({ filters, onChange }) {
  const { updateSearch } = useFoodFilter(filters, onChange);

  return (
    <label className="food-filter">
      Search food
      <input value={filters.search || ''} onChange={(event) => updateSearch(event.target.value)} />
    </label>
  );
}
