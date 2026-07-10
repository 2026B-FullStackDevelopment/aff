// Contains frontend food listing API calls and uses the shared HTTP client.
import { API_ROUTES } from '../../../config/apiRoutes.js';
import { httpClient } from '../../../services/httpClient.js';

export const foodService = {
  listFood: () => httpClient.get(API_ROUTES.food.list),
  createFood: (payload) => httpClient.post(API_ROUTES.food.create, payload),
};
