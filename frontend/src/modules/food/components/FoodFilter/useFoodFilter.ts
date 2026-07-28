// Holds FoodFilter behavior so the component can stay reusable and easy to customize.
export function useFoodFilter(filters, onChange) {
  function updateSearch(search) {
    onChange({ ...filters, search });
  }

  return { updateSearch };
}
