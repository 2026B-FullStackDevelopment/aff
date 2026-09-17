import { useCallback, useState } from 'react';
import { nominatimService } from '@/shared/services/nominatim.service';

export interface CurrentLocationData {
  addressText: string;
  latitude: number;
  longitude: number;
  rawAddress?: Record<string, string>;
}

export function useCurrentLocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation =
    useCallback(async (): Promise<CurrentLocationData | null> => {
      if (!navigator.geolocation) {
        setError(
          'Geolocation is not supported by this browser.',
        );
        return null;
      }

      setIsLoading(true);
      setError(null);

      // Use getCurrentPosition to get the current location, 
      // this will show a dialog asking for location permission
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              },
            );
          },
        );

        const {
          latitude,
          longitude,
        } = position.coords;

        const place =
          await nominatimService.reverseGeocode(
            latitude,
            longitude,
          );

        if (!place) {
          setError(
            'Unable to resolve your current address.',
          );
          return null;
        }

        return {
          addressText: place.display_name,
          latitude,
          longitude,
          rawAddress: place.address,
        };
      } catch (err: unknown) {
        if (
          err instanceof GeolocationPositionError
        ) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError(
                'Location permission was denied. Please enable location access and try again.',
              );
              break;

            case err.POSITION_UNAVAILABLE:
              setError(
                'Your current location is unavailable. Please try again.',
              );
              break;

            case err.TIMEOUT:
              setError(
                'Location request timed out. Please try again.',
              );
              break;

            default:
              setError(
                'Unable to retrieve your current location.',
              );
          }
        } else {
          setError(
            'Unable to retrieve your current address. Please try again.',
          );
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getCurrentLocation,
    isLoading,
    error,
    clearError,
  };
}
