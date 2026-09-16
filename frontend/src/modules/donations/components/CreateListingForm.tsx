import {
  Banknote,
  Copy,
  LoaderCircle,
  PackageOpen,
  Scale,
} from 'lucide-react';
import type { ListingDTO } from '@/types/api';
import { Button } from '@/shared/components/Button';
import { CheckboxField } from '@/shared/components/CheckboxField';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert';
import { IconField } from '@/shared/components/IconField';
import { Panel } from '@/shared/components/Panel';
import { SelectField } from '@/shared/components/SelectField';
import { SwitchField } from '@/shared/components/SwitchField';
import { TextareaField } from '@/shared/components/TextareaField';
import { WarningCallout } from '@/shared/components/WarningCallout';
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { UNIT_OPTIONS } from '@/shared/constants/units';
import { ListingImageUpload } from './ListingImageUpload';
import { useCreateListing } from '../hooks/useCreateListing';

interface CreateListingFormProps {
  cloneSource?: ListingDTO | null;
  onBack?: () => void;
}

function getSuccessTitle(
  submissionKind: ReturnType<
    typeof useCreateListing
  >['submissionKind'],
): string {
  if (submissionKind === 'CLONED') {
    return 'Listing duplicated';
  }

  if (submissionKind === 'EDITED_COPY') {
    return 'Edited copy created';
  }

  return 'Listing created';
}

// Renders new and editable duplicate listing modes.
export function CreateListingForm({
  cloneSource = null,
  onBack,
}: CreateListingFormProps) {
  const {
    form,
    errors,
    submitError,
    createdListing,
    submissionKind,
    previewUrl,
    currentImageUrl,
    imageError,
    isUploading,
    isSubmitting,
    isPerRequest,
    hasCloneChanges,
    canSubmit,
    updateField,
    setVegetarian,
    setPerRequestAcknowledgement,
    selectImage,
    removeImage,
    handleSubmit,
    resetForm,
  } = useCreateListing({
    cloneSource,
  });

  const isCloneMode =
    cloneSource !== null;

  const submitLabel = isCloneMode
    ? hasCloneChanges
      ? 'Create Edited Copy'
      : 'Duplicate Listing'
    : 'Create Listing';

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        aria-busy={
          isSubmitting || isUploading
        }
        noValidate
      >
        <Panel
          title={
            isCloneMode
              ? 'Review Listing Copy'
              : 'Listing Information'
          }
          description={
            isCloneMode
              ? 'Review the reusable configuration and change anything that differs for this listing.'
              : 'Description and image are optional. Vegetarian status should be enabled only when applicable.'
          }
          contentClassName="space-y-6 p-5 sm:p-7"
        >
          {isCloneMode && (
            <WarningCallout
              title={
                hasCloneChanges
                  ? 'Edited copy'
                  : 'Exact duplicate'
              }
            >
              {hasCloneChanges
                ? 'You changed one or more fields. AFF will create a new independent listing using the edited values.'
                : 'No listing fields have changed. AFF will duplicate the source listing and reset its status, available quantity, and creation date.'}
            </WarningCallout>
          )}

          <ListingImageUpload
            currentImageUrl={currentImageUrl}
            previewUrl={previewUrl}
            imageAlt={
              form.name.trim()
                ? `${form.name.trim()} preview`
                : 'Food listing preview'
            }
            helperText={
              isCloneMode
                ? 'The source image is reused unless you replace or remove it.'
                : 'Optional. Upload a PNG, JPEG, or WebP image.'
            }
            error={imageError}
            isUploading={isUploading}
            onFileSelected={selectImage}
            onRemove={removeImage}
          />

          <div className="border-t border-[#E4E2E1]" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <IconField
              id="listingName"
              name="name"
              label="Donation name"
              required
              icon={PackageOpen}
              value={form.name}
              onChange={updateField('name')}
              placeholder="e.g. Fresh Vegetable Box"
              autoComplete="off"
              error={errors.name}
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <SelectField
              id="listingCategory"
              name="category"
              label="Food category"
              required
              options={CATEGORY_OPTIONS}
              placeholder="Select category"
              value={form.category}
              onChange={updateField('category')}
              error={errors.category}
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />
          </div>

          <TextareaField
            id="listingDescription"
            name="description"
            label="Description"
            value={form.description}
            onChange={updateField('description')}
            placeholder="Describe the food, condition, packaging, or collection details."
            helperText="Optional. Do not include private contact information."
            error={errors.description}
            theme="donor"
            className="min-h-28 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField
              id="listingUnit"
              name="unit"
              label="Measurement unit"
              required
              options={UNIT_OPTIONS}
              placeholder="Select unit"
              value={form.unit}
              onChange={updateField('unit')}
              error={errors.unit}
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="donationLimit"
              name="donationLimit"
              type="number"
              label="Donation limit"
              required
              icon={Scale}
              min="1"
              step="1"
              inputMode="numeric"
              value={form.donationLimit}
              onChange={updateField(
                'donationLimit',
              )}
              placeholder="0"
              helperText="Enter a positive whole-number quantity."
              error={errors.donationLimit}
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="rationLimitPerPerson"
              name="rationLimitPerPerson"
              type="number"
              label="Ration per person"
              icon={Scale}
              min="1"
              step="1"
              inputMode="numeric"
              value={
                form.rationLimitPerPerson
              }
              onChange={updateField(
                'rationLimitPerPerson',
              )}
              placeholder="No limit"
              helperText="Optional positive whole-number cap per Recipient."
              error={
                errors.rationLimitPerPerson
              }
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />

            <IconField
              id="listingPrice"
              name="price"
              type="number"
              label="Price in VND"
              required
              icon={Banknote}
              min="0"
              step="1"
              inputMode="numeric"
              value={form.price}
              onChange={updateField('price')}
              placeholder="0"
              helperText="Enter 0 for free, or 15,000 VND and above."
              error={errors.price}
              theme="donor"
              className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
            />
          </div>

          <SwitchField
            id="vegetarianStatus"
            label="Vegetarian food"
            description="Enable this only when the listing contains no meat, poultry, fish, or animal-derived ingredients that your organization classifies as non-vegetarian."
            checked={form.isVegetarian}
            theme="donor"
            onCheckedChange={setVegetarian}
            className="border-[#C1C8C2] bg-[#FBF9F8]"
          />

          {isPerRequest && (
            <WarningCallout
              title="Per Request warning"
              action={
                <CheckboxField
                  id="acknowledgedPerRequest"
                  name="acknowledgedPerRequest"
                  label="I understand and acknowledge these conditions."
                  description="Acknowledgement is required before this listing can be created."
                  checked={
                    form.acknowledgedPerRequest
                  }
                  onChange={(event) =>
                    setPerRequestAcknowledgement(
                      event.target.checked,
                    )
                  }
                  error={
                    errors.acknowledgedPerRequest
                  }
                  theme="donor"
                />
              }
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Online reservation is not
                  available for this listing.
                </li>
                <li>
                  Collection quantities are
                  determined at the Donor&apos;s
                  discretion.
                </li>
                <li>
                  Recipients may arrive after all
                  available food has already been
                  distributed.
                </li>
              </ul>
            </WarningCallout>
          )}

          {isCloneMode && (
            <div
              className="grid grid-cols-1 gap-4 rounded-lg border border-[#E4E2E1] bg-[#FBF9F8] p-4 sm:grid-cols-3"
              aria-label="New listing values"
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
                  {form.donationLimit || 'Not set'}
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
          )}

          <FormErrorAlert
            message={submitError}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-[#E4E2E1] pt-5 sm:flex-row sm:items-center sm:justify-end">
            {onBack && (
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
            )}

            {!isCloneMode
              && createdListing
              && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="h-11 border-[#C1C8C2] px-5 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                >
                  Create another
                </Button>
              )}

            {!createdListing && (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-11 bg-[#805300] px-6 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    {isCloneMode
                      ? 'Creating copy…'
                      : 'Creating listing…'}
                  </>
                ) : (
                  <>
                    {isCloneMode && (
                      <Copy
                        className="size-4"
                        aria-hidden="true"
                      />
                    )}
                    {submitLabel}
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

export default CreateListingForm;
