import {
  Banknote,
  LoaderCircle,
  PackageOpen,
  Scale,
} from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { CheckboxField } from '@/shared/components/CheckboxField/CheckboxField';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { IconField } from '@/shared/components/IconField/IconField';
import { Panel } from '@/shared/components/Panel/Panel';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { SwitchField } from '@/shared/components/SwitchField/SwitchField';
import { TextareaField } from '@/shared/components/TextareaField/TextareaField';
import { Toast } from '@/shared/components/Toast/Toast';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { ListingImageUpload } from '../ListingImageUpload/ListingImageUpload';
import { useCreateListing } from '../../hooks/useCreateListing';

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

// Renders the C1 listing form using shared AFF form components.
export function CreateListingForm() {
  const {
    form,
    errors,
    submitError,
    createdListing,
    previewUrl,
    imageError,
    isUploading,
    isSubmitting,
    isPerRequest,
    canSubmit,
    updateField,
    setVegetarian,
    setPerRequestAcknowledgement,
    selectImage,
    removeImage,
    handleSubmit,
    resetForm,
  } = useCreateListing();

  return (
    <div className="space-y-4">
      {createdListing && (
        <Toast
          variant="success"
          title="Listing created"
          message={`${createdListing.name} is now active and available to Recipients.`}
          imageUrl={createdListing.imageUrl}
          className="max-w-none"
        />
      )}

      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmitting || isUploading}
        noValidate
      >
        <Panel
          title="Listing Information"
          description="Description and image are optional. Vegetarian status should be enabled only when applicable."
          contentClassName="space-y-6 p-5 sm:p-7"
        >
          <ListingImageUpload
            previewUrl={previewUrl}
            imageAlt={
              form.name.trim()
                ? `${form.name.trim()} preview`
                : 'Food listing preview'
            }
            helperText="Optional. Upload a PNG, JPEG, or WebP image."
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
              min="0"
              step="any"
              inputMode="decimal"
              value={form.donationLimit}
              onChange={updateField('donationLimit')}
              placeholder="0"
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
              min="0"
              step="any"
              inputMode="decimal"
              value={form.rationLimitPerPerson}
              onChange={updateField('rationLimitPerPerson')}
              placeholder="No limit"
              helperText="Optional per-Recipient cap."
              error={errors.rationLimitPerPerson}
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
              helperText="Enter 0 for free, or more than 1000 VND."
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
                  checked={form.acknowledgedPerRequest}
                  onChange={(event) =>
                    setPerRequestAcknowledgement(
                      event.target.checked,
                    )
                  }
                  error={errors.acknowledgedPerRequest}
                  theme="donor"
                />
              }
            >
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Online reservation is not available for this
                  listing.
                </li>
                <li>
                  Collection quantities are determined at the
                  Donor&apos;s discretion.
                </li>
                <li>
                  Recipients may arrive after all available food
                  has already been distributed.
                </li>
              </ul>
            </WarningCallout>
          )}

          <FormErrorAlert message={submitError} />

          <div className="flex flex-col-reverse gap-3 border-t border-[#E4E2E1] pt-5 sm:flex-row sm:items-center sm:justify-end">
            {createdListing && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-11 border-[#C1C8C2] px-5 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
              >
                Create another
              </Button>
            )}

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
                  Creating listing…
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </div>
        </Panel>
      </form>
    </div>
  );
}

export default CreateListingForm;