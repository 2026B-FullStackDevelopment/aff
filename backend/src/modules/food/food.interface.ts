// Exposes safe food listing operations for other modules without importing food.service directly.
import * as foodService from './food.service.js';

const foodInterface = {
  getFoodListingById: foodService.getFoodListingById,
  markFoodReserved: foodService.markFoodReserved,
};

export { foodInterface };
