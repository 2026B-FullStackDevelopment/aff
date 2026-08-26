import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { useCloneListing } from '..//hooks/useCloneListing';
import { CreateListingForm } from './CreateListingForm';

interface CloneListingFormProps {
  listingId: string;
  onBack: () => void;
}

// Loads a source listing and opens it in the reusable creation form.
export function CloneListingForm({
  listingId,
  onBack,
}: CloneListingFormProps) {
  const {
    sourceListing,
    loadError,
    isLoading,
    retryLoad,
  } = useCloneListing(listingId);

  if (isLoading) {
    return <LoadingSkeleton count={1} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={loadError.title}
        message={loadError.message}
        retryLabel="Reload Listing"
        onRetry={retryLoad}
      />
    );
  }

  if (!sourceListing) {
    return (
      <ErrorState
        title="Listing unavailable"
        message="The source listing could not be prepared for duplication."
        retryLabel="Reload Listing"
        onRetry={retryLoad}
      />
    );
  }

  return (
    <CreateListingForm
      cloneSource={sourceListing}
      onBack={onBack}
    />
  );
}

export default CloneListingForm;