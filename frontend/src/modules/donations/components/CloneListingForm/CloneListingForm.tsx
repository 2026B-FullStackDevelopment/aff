import {
  Banknote,
  Copy,
  LoaderCircle,
  PackageOpen,
  Scale,
} from 'lucide-react';
import type { SubmitEvent } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { IconField } from '@/shared/components/IconField/IconField';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Panel } from '@/shared/components/Panel/Panel';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { SwitchField } from '@/shared/components/SwitchField/SwitchField';
import { TextareaField } from '@/shared/components/TextareaField/TextareaField';
import { Toast } from '@/shared/components/Toast/Toast';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { ListingImageUpload } from '../ListingImageUpload/ListingImageUpload';
import { useCloneListing } from '../../hooks/useCloneListing';

interface CloneListingFormProps {
  listingId: string;
  onBack: () => void;
}

const CATEGORY_OPTIONS = [
  { label: 'Fruit', value: 'FRUIT' },
  { label: 'Vegetable', value: 'VEGETABLE' },
  { label: 'Meat', value: 'MEAT' },
  { label: 'Cooked Dish', value: 'COOKED_DISH' },
  { label: 'Baked Goods', value: 'BAKED_GOODS' },
  { label: 'Drink', value: 'DRINK' },
];

const UNIT_OPTIONS = [
  { label: 'Kilogram', value: 'KILOGRAM' },
  { label: 'Gram', value: 'GRAM' },
  { label: 'Liter', value: 'LITER' },
  { label: 'Milliliter', value: 'MILLILITER' },
  { label: 'Unit', value: 'UNIT' },
  { label: 'Per Request', value: 'PER_REQUEST' },
];

// Presents the source listing and confirms an exact C2 clone.
export function CloneListingForm({
  listingId,
  onBack,
}: CloneListingFormProps) {
  const {
    sourceListing,
    createdListing,
    loadError,
    submitError,
    isLoading,
    isSubmitting,
    confirmClone,
    retryLoad,
  } = useCloneListing(listingId);

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    await confirmClone();
  }

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

  const submitErrorMessage = submitError
    ? `${submitError.title}. ${submitError.message}`
    : null;

  return (
    <div className="space-y-4">
      {createdListing && (
        <Toast
          variant="success"
          title="Listing duplicated"
          message={`${createdListing.name} is now a new active listing.`}
          imageUrl={createdListing.imageUrl}
          className="max-w-none"
        />
      )}

      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
        noValidate
      >
        <Panel
          title="Review Listing Copy"
          description="These fields are copied from the original listing according to the AFF clone contract."
          contentClassName="space-y-6 p-5 sm:p-7"
        >
          <WarningCallout title="Exact-copy behavior">
            The clone API accepts no edited request body. Static
            fields are copied exactly, while status resets to Active,
            available quantity resets to the donation limit, and the
            creation date is generated when you confirm.
          </WarningCallout>

          <ListingImageUpload
            currentImageUrl={sourceListing.imageUrl}
            imageAlt={`${sourceListing.name} source listing`}
            helperText="This image will be copied from the source listing."
            readOnly
            onFileSelected={() => {}}
            onRemove={() => {}}
          />

          <div className="border-t border-[#E4E2E1]" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <IconField
              id="cloneListingName"
              name="name"
              label="Donation name"
              icon={PackageOpen}
              value={sourceListing.name}
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <SelectField
              id="cloneListingCategory"
              name="category"
              label="Food category"
              options={CATEGORY_OPTIONS}
              value={sourceListing.category}
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />
          </div>

          <TextareaField
            id="cloneListingDescription"
            name="description"
            label="Description"
            value={sourceListing.description ?? ''}
            disabled
            theme="donor"
            className="min-h-28 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField
              id="cloneListingUnit"
              name="unit"
              label="Measurement unit"
              options={UNIT_OPTIONS}
              value={sourceListing.unit}
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="cloneDonationLimit"
              name="donationLimit"
              type="number"
              label="Donation limit"
              icon={Scale}
              value={sourceListing.donationLimit}
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="cloneRationLimitPerPerson"
              name="rationLimitPerPerson"
              type="number"
              label="Ration per person"
              icon={Scale}
              value={
                sourceListing.rationLimitPerPerson
                ?? ''
              }
              placeholder="No limit"
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="cloneListingPrice"
              name="price"
              type="number"
              label="Price in VND"
              icon={Banknote}
              value={sourceListing.price}
              disabled
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />
          </div>

          <SwitchField
            id="cloneVegetarianStatus"
            label="Vegetarian food"
            description="The vegetarian setting will be copied from the source listing."
            checked={sourceListing.isVegetarian}
            disabled
            theme="donor"
            onCheckedChange={() => {}}
            className="border-[#C1C8C2] bg-[#FBF9F8]"
          />

          {sourceListing.unit === 'PER_REQUEST' && (
            <WarningCallout title="Per Request listing">
              The duplicated listing will not support online
              reservations. Collection quantities remain at the
              Donor&apos;s discretion, and Recipients may arrive after
              the available food has been distributed.
            </WarningCallout>
          )}

          <div
            className="grid grid-cols-1 gap-4 rounded-lg border border-[#E4E2E1] bg-[#FBF9F8] p-4 sm:grid-cols-3"
            aria-label="New listing runtime values"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                New status
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1B1C1C]">
                Active
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Available quantity
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1B1C1C]">
                {sourceListing.donationLimit}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Creation date
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1B1C1C]">
                Set on confirmation
              </p>
            </div>
          </div>

          <FormErrorAlert
            message={submitErrorMessage}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-[#E4E2E1] pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="h-11 border-[#C1C8C2] px-5 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
            >
              {createdListing
                ? 'Return to Donations'
                : 'Cancel'}
            </Button>

            {!createdListing && (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 bg-[#805300] px-6 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Duplicating listing…
                  </>
                ) : (
                  <>
                    <Copy
                      className="size-4"
                      aria-hidden="true"
                    />
                    Duplicate Listing
                  </>
                )}
              </Button>
            )}
          </div>
        </Panel>
      </form>
    </div>
  );
}

export default CloneListingForm;