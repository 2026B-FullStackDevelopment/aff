// Shapes listing data before sending it to the frontend or another module.
function toListingDto(listing) {
  if (!listing) return null;

  return {
    id: String(listing._id || listing.id),
    title: listing.title,
    description: listing.description,
    price: listing.price,
    status: listing.status,
    pickupLocation: listing.pickupLocation,
    imageUrl: listing.imageUrl,
  };
}

export { toListingDto };
