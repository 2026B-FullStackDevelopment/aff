// Handles food listing HTTP requests and returns food DTOs.
const foodService = require('./food.service');
const { toFoodDto } = require('./food.dto');
const { created, ok } = require('../../shared/http/response');

async function listAvailableFood(req, res, next) {
  try {
    const listings = await foodService.listAvailableFood(req.query);
    return ok(res, listings.map(toFoodDto));
  } catch (error) {
    return next(error);
  }
}

async function createFoodListing(req, res, next) {
  try {
    const listing = await foodService.createFoodListing(req.user.id, req.body);
    return created(res, toFoodDto(listing));
  } catch (error) {
    return next(error);
  }
}

module.exports = { listAvailableFood, createFoodListing };
