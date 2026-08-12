// Reusable hook for address search-as-you-type using OpenStreetMap Nominatim.
// Handles debouncing, request cancellation (AbortController), loading states, and error handling.
import { useState, useEffect, useRef, useCallback } from 'react';
import { nominatimService, type NominatimPlace, type NominatimSearchOptions } from '../services/nominatim.service';

export interface UseNominatimSearchOptions extends NominatimSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export function useNominatimSearch(options: UseNominatimSearchOptions = {}) {
  const { debounceMs = 400, minQueryLength = 3, countrycodes, limit, addressdetails } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      // Abort any prior in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const places = await nominatimService.searchPlaces(trimmed, {
          countrycodes,
          limit,
          addressdetails,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(places);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignored if operation was aborted due to new input or unmount
          return;
        }
        if (!controller.signal.aborted) {
          setError('Failed to fetch location suggestions. Please try again.');
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [query, debounceMs, minQueryLength, countrycodes, limit, addressdetails]);


  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
  };
}
