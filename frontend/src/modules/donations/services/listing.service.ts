import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  ListingDTO,
  OrderDTO,
  PaginatedData,
} from '@/types/api';
import type {
  CreateListingPayload,
  DonorInitiatedDonationPayload,
  ListingOrderDTO,
  ManagedListingDTO,
  MyListingsQuery,
  UpdateListingStatusPayload,
  UpdateListingStatusResponse,
} from '../types';

function buildMyListingsPath(
  query: MyListingsQuery,
): string {
  const parameters = new URLSearchParams();

  parameters.set('status', query.status);

  if (query.search?.trim()) {
    parameters.set('search', query.search.trim());
  }

  if (query.category) {
    parameters.set('category', query.category);
  }

  if (query.from) {
    parameters.set('from', query.from);
  }

  if (query.to) {
    parameters.set('to', query.to);
  }

  if (query.sort) {
    parameters.set('sort', query.sort);
  }

  if (query.order) {
    parameters.set('order', query.order);
  }

  if (query.page) {
    parameters.set('page', String(query.page));
  }

  if (query.limit) {
    parameters.set('limit', String(query.limit));
  }

  return `${API_ROUTES.listings.mine}?${parameters.toString()}`;
}

function buildListingOrdersPath(
  listingId: string,
  page: number,
  limit: number,
): string {
  const parameters = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return `${API_ROUTES.listings.orders(listingId)}?${parameters.toString()}`;
}

export const listingService = {
  // Creates a listing owned by the authenticated Donor.
  createListing: (
    payload: CreateListingPayload,
  ) =>
    httpClient.post<ListingDTO>(
      API_ROUTES.listings.create,
      payload,
    ),

  // Loads a listing for detail or clone review.
  getListing: (
    listingId: string,
  ) =>
    httpClient.get<ListingDTO>(
      API_ROUTES.listings.detail(listingId),
    ),

  // Loads one paginated Active or Past listing group.
  getMyListings: (
    query: MyListingsQuery,
  ) =>
    httpClient.get<PaginatedData<ManagedListingDTO>>(
      buildMyListingsPath(query),
    ),

  // Creates a fresh active listing from an owned listing.
  cloneListing: (
    listingId: string,
  ) =>
    httpClient.post<ListingDTO>(
      API_ROUTES.listings.clone(listingId),
      undefined,
    ),

  // Records a completed in-person Order using only Recipient email and quantity.
  createDonorInitiatedDonation: (
    listingId: string,
    payload: DonorInitiatedDonationPayload,
  ) =>
    httpClient.post<OrderDTO>(
      API_ROUTES.listings.donations(listingId),
      payload,
    ),

  // Applies a Donor-controlled listing status transition.
  updateListingStatus: (
    listingId: string,
    payload: UpdateListingStatusPayload,
  ) =>
    httpClient.patch<UpdateListingStatusResponse>(
      API_ROUTES.listings.status(listingId),
      payload,
    ),

  // Loads tracked orders belonging to an owned listing.
  getListingOrders: (
    listingId: string,
    page = 1,
    limit = 20,
  ) =>
    httpClient.get<PaginatedData<ListingOrderDTO>>(
      buildListingOrdersPath(
        listingId,
        page,
        limit,
      ),
    ),
};
