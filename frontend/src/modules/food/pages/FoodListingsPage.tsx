// Food listings page screen where recipients browse available donor food.
import { FoodCard } from '../components/FoodCard/FoodCard.jsx';
import { FoodFilter } from '../components/FoodFilter/FoodFilter.jsx';
import { useFoodListings } from '../hooks/useFoodListings.js';

export function FoodListingsPage() {
  const { listings, filters, setFilters, isLoading } = useFoodListings();

  return (
    <main>
      <h1>Available Food</h1>
      <FoodFilter filters={filters} onChange={setFilters} />
      {isLoading ? <p>Loading food listings...</p> : null}
      <section aria-label="Food listings">
        {listings.map((food) => (
          <FoodCard key={food.id} food={food} />
        ))}
      </section>
    </main>
  );
}
