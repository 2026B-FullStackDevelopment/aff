import {
  useEffect,
  useState,
  type SubmitEvent,
} from 'react';
import type {
  OrderDTO,
  PaymentMethod,
} from '@/types/api';
import { listingService } from '../services/listing.service';
import type { ManagedListingDTO } from '../types';

export interface ManualDonationFieldErrors {
  recipientEmail?: string;
  listingId?: string;
  quantity?: string;
  paymentMethod?: string;
}

interface ManualDonationFormState {
  recipientQuery: string;
  resolvedRecipientEmail: string | null;
  listingId: string;
  quantity: string;
  paymentMethod: PaymentMethod | '';
}

const INITIAL_FORM: ManualDonationFormState = {
  recipientQuery: '',
  resolvedRecipientEmail: null,
  listingId: '',
  quantity: '1',
  paymentMethod: '',
};

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

function parseQuantity(
  value: string,
): number | null {
  if (!value.trim()) {
    return null;
  }

  const quantity = Number(value);

  if (
    !Number.isFinite(quantity)
    || quantity <= 0
  ) {
    return null;
  }

  return quantity;
}

function validateForm(
  form: ManualDonationFormState,
  selectedListing: ManagedListingDTO | null,
): ManualDonationFieldErrors {
  const errors: ManualDonationFieldErrors = {};

  if (!form.recipientQuery.trim()) {
    errors.recipientEmail =
      'Search for a registered Recipient by email.';
  } else if (!form.resolvedRecipientEmail) {
    errors.recipientEmail =
      'Select a registered Recipient from the email lookup results.';
  }

  if (!selectedListing) {
    errors.listingId =
      'Select an eligible active listing.';
  } else if (selectedListing.status !== 'ACTIVE') {
    errors.listingId =
      'Only active listings can be used for a manual donation.';
  } else if (
    selectedListing.unit === 'PER_REQUEST'
  ) {
    errors.listingId =
      'Per Request listings do not create tracked donations.';
  } else if (
    selectedListing.quantityRemaining <= 0
  ) {
    errors.listingId =
      'This listing has no remaining quantity.';
  }

  const quantity = parseQuantity(form.quantity);

  if (quantity === null) {
    errors.quantity =
      'Quantity must be greater than 0.';
  } else if (selectedListing) {
    if (
      quantity
      > selectedListing.quantityRemaining
    ) {
      errors.quantity =
        `Quantity cannot exceed the remaining ${selectedListing.quantityRemaining}.`;
    } else if (
      selectedListing.rationLimitPerPerson !== null
      && quantity
        > selectedListing.rationLimitPerPerson
    ) {
      errors.quantity =
        `Quantity cannot exceed the ration limit of ${selectedListing.rationLimitPerPerson}.`;
    }
  }

  if (
    selectedListing
    && selectedListing.price > 0
    && !form.paymentMethod
  ) {
    errors.paymentMethod =
      'Select Stripe or cash for this priced listing.';
  }

  return errors;
}

// Owns C3 listing selection, validation, and donation submission.
export function useManualDonation() {
  const [form, setForm] =
    useState<ManualDonationFormState>(
      INITIAL_FORM,
    );

  const [listings, setListings] =
    useState<ManagedListingDTO[]>([]);

  const [fieldErrors, setFieldErrors] =
    useState<ManualDonationFieldErrors>({});

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [createdOrder, setCreatedOrder] =
    useState<OrderDTO | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isListingsEndpointUnavailable, setIsListingsEndpointUnavailable] =
    useState(false);

  const [loadVersion, setLoadVersion] =
    useState(0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadEligibleListings() {
      setIsLoading(true);
      setLoadError(null);
      setIsListingsEndpointUnavailable(false);

      try {
        const response =
          await listingService.getMyListings({
            status: 'ACTIVE',
            sort: 'createdAt',
            order: 'desc',
            page: 1,
            limit: 100,
          });

        if (ignoreResult) {
          return;
        }

        if (response.status === 501) {
          setIsListingsEndpointUnavailable(true);
          setLoadError(
            'Owned listing management is not implemented by the backend yet.',
          );
          return;
        }

        if (!response.ok || !response.data) {
          setLoadError(
            getResponseMessage(
              response.data,
              'Unable to load your active listings.',
            ),
          );
          return;
        }

        const eligibleListings =
          response.data.items.filter(
            (listing) =>
              listing.status === 'ACTIVE'
              && listing.unit !== 'PER_REQUEST'
              && listing.quantityRemaining > 0,
          );

        setListings(eligibleListings);
      } catch {
        if (!ignoreResult) {
          setLoadError(
            'Unable to reach AFF. Check your connection and try again.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadEligibleListings();

    return () => {
      ignoreResult = true;
    };
  }, [loadVersion]);

  const selectedListing =
    listings.find(
      (listing) =>
        listing.id === form.listingId,
    ) ?? null;

  const isPriced =
    Boolean(
      selectedListing
      && selectedListing.price > 0,
    );

  function clearFieldError(
    field: keyof ManualDonationFieldErrors,
  ) {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function setRecipientQuery(
    nextQuery: string,
  ) {
    setForm((current) => ({
      ...current,
      recipientQuery: nextQuery,
      resolvedRecipientEmail:
        current.resolvedRecipientEmail
        === nextQuery.trim().toLowerCase()
          ? current.resolvedRecipientEmail
          : null,
    }));

    clearFieldError('recipientEmail');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function selectRecipient(
    recipientEmail: string,
  ) {
    const normalizedEmail =
      recipientEmail.trim().toLowerCase();

    setForm((current) => ({
      ...current,
      recipientQuery: normalizedEmail,
      resolvedRecipientEmail:
        normalizedEmail,
    }));

    clearFieldError('recipientEmail');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function clearRecipientSelection() {
    setForm((current) => ({
      ...current,
      recipientQuery: '',
      resolvedRecipientEmail: null,
    }));

    clearFieldError('recipientEmail');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function setListingId(
    nextListingId: string,
  ) {
    const nextListing =
      listings.find(
        (listing) =>
          listing.id === nextListingId,
      ) ?? null;

    setForm((current) => ({
      ...current,
      listingId: nextListingId,
      paymentMethod:
        nextListing?.price === 0
          ? ''
          : current.paymentMethod,
    }));

    clearFieldError('listingId');
    clearFieldError('quantity');
    clearFieldError('paymentMethod');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function setQuantity(
    nextQuantity: string,
  ) {
    setForm((current) => ({
      ...current,
      quantity: nextQuantity,
    }));

    clearFieldError('quantity');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function setPaymentMethod(
    nextPaymentMethod: PaymentMethod | '',
  ) {
    setForm((current) => ({
      ...current,
      paymentMethod: nextPaymentMethod,
    }));

    clearFieldError('paymentMethod');
    setSubmitError(null);
    setCreatedOrder(null);
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitError(null);
    setCreatedOrder(null);

    const nextErrors = validateForm(
      form,
      selectedListing,
    );

    setFieldErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
      || !selectedListing
      || !form.resolvedRecipientEmail
    ) {
      return;
    }

    const quantity =
      parseQuantity(form.quantity);

    if (quantity === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await listingService.createDonorInitiatedDonation(
          selectedListing.id,
          {
            recipientEmail:
              form.resolvedRecipientEmail,
            quantity,
            paymentMethod:
              selectedListing.price > 0
                ? form.paymentMethod as PaymentMethod
                : undefined,
          },
        );

      if (response.status === 501) {
        setSubmitError(
          'Manual donations are not implemented by the backend yet.',
        );
        return;
      }

      if (response.status === 403) {
        setSubmitError(
          'You do not have permission to donate from this listing.',
        );
        return;
      }

      if (response.status === 404) {
        setFieldErrors((current) => ({
          ...current,
          recipientEmail:
            'No registered Recipient was found for this email.',
        }));
        return;
      }

      if (response.status === 422) {
        const message = getResponseMessage(
          response.data,
          'The quantity or listing is not eligible for this donation.',
        );

        const normalizedMessage =
          message.toLowerCase();

        if (
          normalizedMessage.includes(
            'per request',
          )
          || normalizedMessage.includes(
            'per_request',
          )
        ) {
          setFieldErrors((current) => ({
            ...current,
            listingId: message,
          }));
        } else {
          setFieldErrors((current) => ({
            ...current,
            quantity: message,
          }));
        }

        return;
      }

      if (response.status === 400) {
        setFieldErrors((current) => ({
          ...current,
          paymentMethod:
            getResponseMessage(
              response.data,
              'Select a payment method for this listing.',
            ),
        }));
        return;
      }

      if (!response.ok || !response.data) {
        setSubmitError(
          getResponseMessage(
            response.data,
            'Unable to record the donation.',
          ),
        );
        return;
      }

      setCreatedOrder(response.data);
    } catch {
      setSubmitError(
        'Unable to reach AFF. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearForm() {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSubmitError(null);
    setCreatedOrder(null);
  }

  function retryListings() {
    setLoadVersion((current) => current + 1);
  }

  const canSubmit =
    !isLoading
    && !isSubmitting
    && !createdOrder
    && Object.keys(
      validateForm(
        form,
        selectedListing,
      ),
    ).length === 0;

  return {
    form,
    listings,
    selectedListing,
    fieldErrors,
    loadError,
    submitError,
    createdOrder,
    isLoading,
    isSubmitting,
    isPriced,
    isListingsEndpointUnavailable,
    canSubmit,
    setRecipientQuery,
    selectRecipient,
    clearRecipientSelection,
    setListingId,
    setQuantity,
    setPaymentMethod,
    handleSubmit,
    clearForm,
    retryListings,
  };
}

export default useManualDonation;