// Contains food listing business rules and calls the food repository for database work.
const foodRepository = require('./food.repository');

async function listAvailableFood(filters = {}) {
  return foodRepository.findAvailableFood(filters);
}

async function createFoodListing(donorId, payload) {
  return foodRepository.createFoodListing({
    donorId,
    title: payload.title,
    description: payload.description,
    price: payload.price || 0,
    status: 'AVAILABLE',
    pickupLocation: payload.pickupLocation,
  });
}

async function getFoodListingById(id) {
  return foodRepository.findFoodListingById(id);
}

async function markFoodReserved(id) {
  return foodRepository.updateFoodListing(id, { status: 'RESERVED' });
}

module.exports = { listAvailableFood, createFoodListing, getFoodListingById, markFoodReserved };
