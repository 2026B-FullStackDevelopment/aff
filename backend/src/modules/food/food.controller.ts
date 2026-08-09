// Handles food listing HTTP requests and returns food DTOs.
import * as foodService from './food.service.js';
import { toFoodDto } from './food.dto.js';
import { created, ok } from '../../shared/http/response.js';

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

export { listAvailableFood, createFoodListing };
