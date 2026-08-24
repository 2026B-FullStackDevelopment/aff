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

    return {
        title: 'Unable to load listing',
        message: getResponseMessage(
            data,
            'The source listing could not be loaded. Please try again.',
        ),
    };
}

// Loads the source listing before opening the editable copy form.
export function useCloneListing(
    listingId: string | null,
) {
    const [sourceListing, setSourceListing] =
        useState<ListingDTO | null>(null);

    const [loadError, setLoadError] =
        useState<CloneListingProblem | null>(null);

    const [isLoading, setIsLoading] =
        useState(Boolean(listingId));

    const [loadVersion, setLoadVersion] =
        useState(0);

    useEffect(() => {
        let ignoreResult = false;

        if (!listingId) {
            setSourceListing(null);
            setLoadError(null);
            setIsLoading(false);
            return;
        }

        async function loadSourceListing() {
            setIsLoading(true);
            setSourceListing(null);
            setLoadError(null);

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

    function retryLoad() {
        setLoadVersion((current) => current + 1);
    }

    return {
        sourceListing,
        loadError,
        isLoading,
        retryLoad,
    };
}

export default useCloneListing;