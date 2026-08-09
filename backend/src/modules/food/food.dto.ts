// Shapes food listing data before sending it to the frontend or another module.
function toFoodDto(food) {
  if (!food) return null;

  return {
    id: String(food._id || food.id),
    title: food.title,
    description: food.description,
    price: food.price,
    status: food.status,
    pickupLocation: food.pickupLocation,
    imageUrl: food.imageUrl,
  };
}

export { toFoodDto };
