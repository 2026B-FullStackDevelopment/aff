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
  mediaService,
  uploadFileToSignedUrl,
} from '@/shared/services/media.service';
import { listingService } from '../services/listing.service';
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

const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

const INITIAL_FORM: CreateListingFormState = {
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

function parseNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
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

  const donationLimit = parseNumber(form.donationLimit);

  if (donationLimit === null || donationLimit <= 0) {
    errors.donationLimit =
      'Donation limit must be greater than 0.';
  }

  const rationLimit = parseNumber(
    form.rationLimitPerPerson,
  );

  if (
    form.rationLimitPerPerson.trim() !== ''
    && (rationLimit === null || rationLimit <= 0)
  ) {
    errors.rationLimitPerPerson =
      'Ration limit must be greater than 0 when provided.';
  }

  const price = parseNumber(form.price);

  if (price === null) {
    errors.price = 'Enter a valid price.';
  } else if (price < 0) {
    errors.price = 'Price cannot be negative.';
  } else if (price !== 0 && price <= 1000) {
    errors.price =
      'Price must be free (0) or strictly greater than 1000 VND.';
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

// Owns New Food Listing form state, validation, upload, and submission.
export function useCreateListing() {
  const [form, setForm] =
    useState<CreateListingFormState>(INITIAL_FORM);

  const [errors, setErrors] =
    useState<CreateListingFieldErrors>({});

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [createdListing, setCreatedListing] =
    useState<ListingDTO | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [imageUrl, setImageUrl] =
    useState<string | null>(null);

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
      setSubmitError(null);
      setCreatedListing(null);
    };
  }

  function setVegetarian(checked: boolean) {
    setForm((current) => ({
      ...current,
      isVegetarian: checked,
    }));

    clearFieldError('isVegetarian');
    setSubmitError(null);
    setCreatedListing(null);
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
    setSubmitError(null);
    setCreatedListing(null);

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

      setImageUrl(uploadUrlResponse.data.mediaUrl);
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
    setSubmitError(null);
    setCreatedListing(null);
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
      donationLimit: Number(form.donationLimit),
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

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
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

    setIsSubmitting(true);

    try {
      const response = await listingService.createListing(
        buildPayload(),
      );

      if (!response.ok || !response.data) {
        setSubmitError(
          getResponseMessage(
            response.data,
            'Unable to create the listing. Please review the form and try again.',
          ),
        );
        return;
      }

      setCreatedListing(response.data);
    } catch {
      setSubmitError(
        'Unable to reach AFF. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError(null);
    setCreatedListing(null);
    removeImage();
  }

  const isPerRequest =
    form.unit === 'PER_REQUEST';

  const isBusy =
    isUploading || isSubmitting;

  const canSubmit =
    !isBusy
    && (
      !isPerRequest
      || form.acknowledgedPerRequest
    );

  return {
    form,
    errors,
    submitError,
    createdListing,
    previewUrl,
    imageError,
    isUploading,
    isSubmitting,
    isPerRequest,
    isBusy,
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