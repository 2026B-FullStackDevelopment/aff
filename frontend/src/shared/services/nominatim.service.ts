// Shared service for location geocoding via OpenStreetMap Nominatim API.

export interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
  address?: Record<string, string>;
}

export interface NominatimSearchOptions {
  countrycodes?: string;
  limit?: number;
  addressdetails?: number;
  signal?: AbortSignal;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const DEFAULT_USER_AGENT = 'AFF-App-Registration/1.0';

export const nominatimService = {
  /**
   * Search for locations matching the given address query string.
   */
  async searchPlaces(query: string, options: NominatimSearchOptions = {}): Promise<NominatimPlace[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const params = new URLSearchParams({
      format: 'json',
      q: trimmed,
      limit: String(options.limit ?? 5),
      addressdetails: String(options.addressdetails ?? 1),
    });

    if (options.countrycodes) {
      params.set('countrycodes', options.countrycodes);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Nominatim search request failed with status ${response.status}`);
    }

    const data: NominatimPlace[] = await response.json();
    return data;
  },

  /**
   * Reverse geocode a latitude and longitude to get location details.
   */
  async reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<NominatimPlace | null> {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(latitude),
      lon: String(longitude),
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse request failed with status ${response.status}`);
    }

    const data: NominatimPlace = await response.json();
    return data;
  },
};

