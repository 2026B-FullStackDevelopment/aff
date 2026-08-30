import {
  useEffect,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from 'react';
import type {
  FoodCategory,
  ListingDTO,
  ListingUnit,
} from '@/types/api';
import {
  ACCEPTED_IMAGE_TYPES,
  mediaService,
  uploadFileToSignedUrl,
} from '@/shared/services/media.service';
import { listingService } from '../services/listing.service';
import { getResponseMessage } from '@/shared/utils/apiError';
import { toast } from '@/shared/components/ui/sonner';
import type { CreateListingPayload } from '../types';

export interface CreateListingFormState {
  name: string;
  category: FoodCategory | '';
  description: string;
  unit: ListingUnit | '';
  donationLimit: string;
  rationLimitPerPerson: string;
  price: string;
  isVegetarian: boolean;
  acknowledgedPerRequest: boolean;
}

interface UseCreateListingOptions {
  cloneSource?: ListingDTO | null;
}

type TextFieldName =
  | 'name'
  | 'category'
  | 'description'
  | 'unit'
  | 'donationLimit'
  | 'rationLimitPerPerson'
  | 'price';

export type CreateListingFieldErrors = Partial<
  Record<keyof CreateListingFormState, string>
>;

export type ListingSubmissionKind =
  | 'CREATED'
  | 'CLONED'
  | 'EDITED_COPY';

function getInitialForm(
  source?: ListingDTO | null,
): CreateListingFormState {
  if (!source) {
    return {
      name: '',
      category: '',
      description: '',
      unit: '',
      donationLimit: '',
      rationLimitPerPerson: '',
      price: '0',
      isVegetarian: false,
      acknowledgedPerRequest: false,
    };
  }

  return {
    name: source.name,
    category: source.category,
    description: source.description ?? '',
    unit: source.unit,
    donationLimit: String(source.donationLimit),
    rationLimitPerPerson:
      source.rationLimitPerPerson === null
        ? ''
        : String(source.rationLimitPerPerson),
    price: String(source.price),
    isVegetarian: source.isVegetarian,
    acknowledgedPerRequest: false,
  };
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}


function validateForm(
  form: CreateListingFormState,
): CreateListingFieldErrors {
  const errors: CreateListingFieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Donation name is required.';
  }

  if (!form.category) {
    errors.category = 'Select a food category.';
  }

  if (!form.unit) {
    errors.unit = 'Select a measurement unit.';
  }

  const donationLimit = parseNumber(
    form.donationLimit,
  );

  if (
    donationLimit === null
    || donationLimit <= 0
  ) {
    errors.donationLimit =
      'Donation limit must be greater than 0.';
  }

  const rationLimit = parseNumber(
    form.rationLimitPerPerson,
  );

  if (
    form.rationLimitPerPerson.trim() !== ''
    && (
      rationLimit === null
      || rationLimit <= 0
    )
  ) {
    errors.rationLimitPerPerson =
      'Ration limit must be greater than 0 when provided.';
  }

  const price = parseNumber(form.price);

  if (price === null) {
    errors.price = 'Enter a valid price.';
  } else if (price < 0) {
    errors.price = 'Price cannot be negative.';
  } else if (
    price !== 0
    && price < 15000
  ) {
    errors.price =
      'Price must be 0 or 15,000 VND and above.';
  }

  if (
    form.unit === 'PER_REQUEST'
    && !form.acknowledgedPerRequest
  ) {
    errors.acknowledgedPerRequest =
      'Acknowledge the Per Request conditions before creating the listing.';
  }

  return errors;
}

function hasPersistedChanges(
  form: CreateListingFormState,
  imageUrl: string | null,
  source: ListingDTO,
): boolean {
  const description =
    form.description.trim() || null;

  const rationLimit = parseNumber(
    form.rationLimitPerPerson,
  );

  return (
    form.name.trim() !== source.name
    || form.category !== source.category
    || description !== source.description
    || form.unit !== source.unit
    || parseNumber(form.donationLimit)
      !== source.donationLimit
    || rationLimit
      !== source.rationLimitPerPerson
    || parseNumber(form.price) !== source.price
    || form.isVegetarian
      !== source.isVegetarian
    || imageUrl !== source.imageUrl
  );
}

function getCloneErrorMessage(
  status: number,
  data: unknown,
): string {
  if (status === 403) {
    return 'This listing does not belong to your Donor account.';
  }

  if (status === 404) {
    return 'The source listing no longer exists.';
  }

  return getResponseMessage(
    data,
    'Unable to duplicate the listing. Please try again.',
  );
}

// Owns listing form state, validation, upload, creation, and duplication.
export function useCreateListing({
  cloneSource = null,
}: UseCreateListingOptions = {}) {
  const [form, setForm] =
    useState<CreateListingFormState>(
      () => getInitialForm(cloneSource),
    );

  const [errors, setErrors] =
    useState<CreateListingFieldErrors>({});

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [createdListing, setCreatedListing] =
    useState<ListingDTO | null>(null);

  const [submissionKind, setSubmissionKind] =
    useState<ListingSubmissionKind | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [imageUrl, setImageUrl] =
    useState<string | null>(
      cloneSource?.imageUrl ?? null,
    );

  const [imageError, setImageError] =
    useState<string | undefined>();

  const [isUploading, setIsUploading] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSubmissionResult() {
    setSubmitError(null);
    setCreatedListing(null);
    setSubmissionKind(null);
  }

  function clearFieldError(
    field: keyof CreateListingFormState,
  ) {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateField(field: TextFieldName) {
    return (
      event: ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
      >,
    ) => {
      const value = event.target.value;

      setForm((current) => {
        const nextForm = {
          ...current,
          [field]: value,
        };

        if (
          field === 'unit'
          && value !== 'PER_REQUEST'
        ) {
          nextForm.acknowledgedPerRequest = false;
        }

        return nextForm;
      });

      clearFieldError(field);
      clearSubmissionResult();
    };
  }

  function setVegetarian(checked: boolean) {
    setForm((current) => ({
      ...current,
      isVegetarian: checked,
    }));

    clearFieldError('isVegetarian');
    clearSubmissionResult();
  }

  function setPerRequestAcknowledgement(
    checked: boolean,
  ) {
    setForm((current) => ({
      ...current,
      acknowledgedPerRequest: checked,
    }));

    clearFieldError('acknowledgedPerRequest');
    setSubmitError(null);
  }

  async function selectImage(file: File) {
    setImageError(undefined);
    clearSubmissionResult();

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError(
        'Upload a PNG, JPEG, or WebP image.',
      );
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setImageUrl(null);
    setIsUploading(true);

    try {
      const uploadUrlResponse =
        await mediaService.requestUploadUrl(
          'LISTING_IMAGE',
          file.type,
        );

      if (
        !uploadUrlResponse.ok
        || !uploadUrlResponse.data
      ) {
        setImageError(
          getResponseMessage(
            uploadUrlResponse.data,
            'Unable to prepare the image upload. Please try again.',
          ),
        );
        return;
      }

      const uploaded = await uploadFileToSignedUrl(
        uploadUrlResponse.data.uploadUrl,
        file,
      );

      if (!uploaded) {
        setImageError(
          'The image upload failed. Please try again.',
        );
        return;
      }

      setImageUrl(
        uploadUrlResponse.data.mediaUrl,
      );
    } catch {
      setImageError(
        'The image upload failed. Check your connection and try again.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage() {
    setPreviewUrl(null);
    setImageUrl(null);
    setImageError(undefined);
    clearSubmissionResult();
  }

  function buildPayload(): CreateListingPayload {
    const description = form.description.trim();

    const rationLimit = parseNumber(
      form.rationLimitPerPerson,
    );

    return {
      name: form.name.trim(),
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      unit: form.unit as ListingUnit,
      category: form.category as FoodCategory,
      isVegetarian: form.isVegetarian,
      price: Number(form.price),
      donationLimit: Number(
        form.donationLimit,
      ),
      rationLimitPerPerson:
        rationLimit ?? undefined,
    };
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitError(null);
    setCreatedListing(null);
    setSubmissionKind(null);

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    if (isUploading) {
      setSubmitError(
        'Wait for the image upload to finish before creating the listing.',
      );
      return;
    }

    if (imageError) {
      setSubmitError(
        'Remove the failed image or upload it again before creating the listing.',
      );
      return;
    }

    const isExactClone =
      cloneSource !== null
      && !hasPersistedChanges(
        form,
        imageUrl,
        cloneSource,
      );

    setIsSubmitting(true);

    try {
      const response = isExactClone
        ? await listingService.cloneListing(
            cloneSource.id,
          )
        : await listingService.createListing(
            buildPayload(),
          );

      if (!response.ok || !response.data) {
        setSubmitError(
          isExactClone
            ? getCloneErrorMessage(
                response.status,
                response.data,
              )
            : getResponseMessage(
                response.data,
                'Unable to create the listing. Please review the form and try again.',
              ),
        );
        return;
      }

      const kind = isExactClone
        ? 'CLONED'
        : cloneSource
          ? 'EDITED_COPY'
          : 'CREATED';

      setSubmissionKind(kind);

      const title =
        kind === 'CLONED'
          ? 'Listing duplicated'
          : kind === 'EDITED_COPY'
            ? 'Edited copy created'
            : 'Listing created';

      toast.success(title, {
        description: `${response.data.name} is now an independent active listing.`,
      });
    } catch {
      setSubmitError(
        'Unable to reach AFF. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setForm(getInitialForm(cloneSource));
    setErrors({});
    setSubmitError(null);
    setCreatedListing(null);
    setSubmissionKind(null);
    setPreviewUrl(null);
    setImageUrl(
      cloneSource?.imageUrl ?? null,
    );
    setImageError(undefined);
  }

  const isPerRequest =
    form.unit === 'PER_REQUEST';

  const isBusy =
    isUploading || isSubmitting;

  const hasCloneChanges =
    cloneSource !== null
    && hasPersistedChanges(
      form,
      imageUrl,
      cloneSource,
    );

  const canSubmit =
    !isBusy
    && !createdListing
    && (
      !isPerRequest
      || form.acknowledgedPerRequest
    );

  return {
    form,
    errors,
    submitError,
    createdListing,
    submissionKind,
    previewUrl,
    currentImageUrl: imageUrl,
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
  };
}

export default useCreateListing;