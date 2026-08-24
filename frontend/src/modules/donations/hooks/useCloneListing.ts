import {
  useEffect,
  useState,
} from 'react';
import type { ListingDTO } from '@/types/api';
import { listingService } from '../services/listing.service';

export interface CloneListingProblem {
  title: string;
  message: string;
}

function getResponseMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    typeof data === 'object'
    && data !== null
    && 'message' in data
    && typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
}

function getLoadProblem(
  status: number,
  data: unknown,
): CloneListingProblem {
  if (status === 403) {
    return {
      title: 'Listing not available',
      message:
        'You do not have permission to review this listing for duplication.',
    };
  }

  if (status === 404) {
    return {
      title: 'Listing no longer exists',
      message:
        'The listing you attempted to duplicate could not be found.',
    };
  }

  if (status === 501) {
    return {
      title: 'Backend work required',
      message:
        'Listing details are not implemented by the backend yet.',
    };
  }

  return {
    title: 'Unable to load listing',
    message: getResponseMessage(
      data,
      'The source listing could not be loaded. Please try again.',
    ),
  };
}

function getCloneProblem(
  status: number,
  data: unknown,
): CloneListingProblem {
  if (status === 403) {
    return {
      title: 'Duplicate not allowed',
      message:
        'This listing does not belong to your Donor account.',
    };
  }

  if (status === 404) {
    return {
      title: 'Listing no longer exists',
      message:
        'The source listing was removed before it could be duplicated.',
    };
  }

  if (status === 501) {
    return {
      title: 'Backend work required',
      message:
        'Listing duplication is not implemented by the backend yet.',
    };
  }

  return {
    title: 'Unable to duplicate listing',
    message: getResponseMessage(
      data,
      'The listing could not be duplicated. Please try again.',
    ),
  };
}

// Owns C2 source loading and exact-copy submission.
export function useCloneListing(
  listingId: string | null,
) {
  const [sourceListing, setSourceListing] =
    useState<ListingDTO | null>(null);

  const [createdListing, setCreatedListing] =
    useState<ListingDTO | null>(null);

  const [loadError, setLoadError] =
    useState<CloneListingProblem | null>(null);

  const [submitError, setSubmitError] =
    useState<CloneListingProblem | null>(null);

  const [isLoading, setIsLoading] =
    useState(Boolean(listingId));

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [loadVersion, setLoadVersion] =
    useState(0);

  useEffect(() => {
    let ignoreResult = false;

    if (!listingId) {
      setSourceListing(null);
      setCreatedListing(null);
      setLoadError(null);
      setSubmitError(null);
      setIsLoading(false);
      return;
    }

    async function loadSourceListing() {
      setIsLoading(true);
      setSourceListing(null);
      setCreatedListing(null);
      setLoadError(null);
      setSubmitError(null);

      try {
        const response =
          await listingService.getListing(listingId);

        if (ignoreResult) {
          return;
        }

        if (!response.ok || !response.data) {
          setLoadError(
            getLoadProblem(
              response.status,
              response.data,
            ),
          );
          return;
        }

        setSourceListing(response.data);
      } catch {
        if (!ignoreResult) {
          setLoadError({
            title: 'Unable to reach AFF',
            message:
              'Check your connection and try loading the listing again.',
          });
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadSourceListing();

    return () => {
      ignoreResult = true;
    };
  }, [listingId, loadVersion]);

  async function confirmClone() {
    if (!listingId || !sourceListing) {
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setCreatedListing(null);

    try {
      const response =
        await listingService.cloneListing(listingId);

      if (!response.ok || !response.data) {
        setSubmitError(
          getCloneProblem(
            response.status,
            response.data,
          ),
        );
        return null;
      }

      setCreatedListing(response.data);
      return response.data;
    } catch {
      setSubmitError({
        title: 'Unable to reach AFF',
        message:
          'Check your connection and try duplicating the listing again.',
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  function retryLoad() {
    setLoadVersion((current) => current + 1);
  }

  function clearSubmitError() {
    setSubmitError(null);
  }

  return {
    sourceListing,
    createdListing,
    loadError,
    submitError,
    isLoading,
    isSubmitting,
    confirmClone,
    retryLoad,
    clearSubmitError,
  };
}

export default useCloneListing;