// Exposes safe food listing operations for other modules without importing food.service directly.
const foodService = require('./food.service');

const foodInterface = {
  getFoodListingById: foodService.getFoodListingById,
  markFoodReserved: foodService.markFoodReserved,
};

module.exports = { foodInterface };
