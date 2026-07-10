// Contains food listing database queries so services do not call Mongoose directly.
const FoodListing = require('./food.model');

function findAvailableFood(filters = {}) {
  return FoodListing.find({ ...filters, status: 'AVAILABLE' }).lean();
}

function createFoodListing(data) {
  return FoodListing.create(data);
}

function findFoodListingById(id) {
  return FoodListing.findById(id).lean();
}

function updateFoodListing(id, data) {
  return FoodListing.findByIdAndUpdate(id, data, { new: true }).lean();
}

module.exports = { findAvailableFood, createFoodListing, findFoodListingById, updateFoodListing };
