// Loads food listings and keeps page state separate from FoodListingsPage JSX.
import { useEffect, useState } from 'react';
import { foodService } from '../services/food.service';

export function useFoodListings() {
  const [filters, setFilters] = useState({});
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setIsLoading(true);
      const response = await foodService.listFood(filters);

      if (isMounted && response.ok) {
        setListings(response.data || []);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadListings();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  return { listings, filters, setFilters, isLoading };
}
