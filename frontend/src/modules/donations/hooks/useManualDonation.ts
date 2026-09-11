import {
    useEffect,
    useState,
    type SubmitEvent,
} from 'react';
import type { OrderDTO } from '@/types/api'; // remove paymentMethod import, only cash
import { listingService } from '../services/listing.service';
import { recipientService } from '../services/recipient.service';
import { getResponseMessage } from '@/shared/utils/apiError';
import { toast } from '@/shared/components/ui/sonner';
import type {
    ManagedListingDTO,
    RecipientSearchResult,
    DonorInitiatedDonationPayload,
} from '../types';

export interface ManualDonationFieldErrors {
    recipientEmail?: string;
    listingId?: string;
    quantity?: string;
    cashReceivedAmount?: string;
}

interface ManualDonationFormState {
    recipientQuery: string;
    listingId: string;
    quantity: string;
    cashReceivedAmount: string;
}

interface SubmittedListingSummary {
    name: string;
    imageUrl: string | null;
}

const INITIAL_FORM: ManualDonationFormState = {
    recipientQuery: '',
    listingId: '',
    quantity: '1',
    cashReceivedAmount: '',
};

// format money to VND
const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

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

function parseCashReceivedAmount(value: string): number | null {
    if (!value.trim()) {
        return null;
    }

    const amount = Number(value);

    return Number.isSafeInteger(amount) && amount >= 0
        ? amount
        : null;
}

function validateForm(
    form: ManualDonationFormState,
    selectedRecipient: RecipientSearchResult | null,
    selectedListing: ManagedListingDTO | null,
): ManualDonationFieldErrors {
    const errors: ManualDonationFieldErrors = {};

    if (!form.recipientQuery.trim()) {
        errors.recipientEmail =
            'Enter the Recipient email address.';
    } else if (!selectedRecipient) {
        errors.recipientEmail =
            'Select a registered Recipient from the search results.';
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

    const quantity =
        parseQuantity(form.quantity);

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

    // cash received logic
    if (
        selectedListing
        && selectedListing.price > 0
        && quantity !== null
    ) {
        const cashReceivedAmount =
            parseCashReceivedAmount(form.cashReceivedAmount);
        const orderTotal =
            selectedListing.price * quantity;

        if (cashReceivedAmount === null) {
            errors.cashReceivedAmount =
                'Enter the whole VND amount received.';
        } else if (cashReceivedAmount < orderTotal) {
            errors.cashReceivedAmount =
                'Money received must cover the order total.';
        }
    }

    return errors;
}

function isAbortError(
    error: unknown,
): boolean {
    return (
        error instanceof DOMException
        && error.name === 'AbortError'
    );
}

// Owns C3 recipient lookup, validation, and donation submission.
export function useManualDonation() {
    const [form, setForm] =
        useState<ManualDonationFormState>(
            INITIAL_FORM,
        );

    const [listings, setListings] =
        useState<ManagedListingDTO[]>([]);

    const [
        selectedRecipient,
        setSelectedRecipient,
    ] = useState<RecipientSearchResult | null>(
        null,
    );

    const [
        recipientResults,
        setRecipientResults,
    ] = useState<RecipientSearchResult[]>([]);

    const [
        recipientSearchError,
        setRecipientSearchError,
    ] = useState<string | null>(null);

    const [
        hasRecipientSearchRun,
        setHasRecipientSearchRun,
    ] = useState(false);

    const [
        isRecipientSearching,
        setIsRecipientSearching,
    ] = useState(false);

    const [fieldErrors, setFieldErrors] =
        useState<ManualDonationFieldErrors>({});

    const [loadError, setLoadError] =
        useState<string | null>(null);

    const [submitError, setSubmitError] =
        useState<string | null>(null);

    const [createdOrder, setCreatedOrder] =
        useState<OrderDTO | null>(null);

    const [
        submittedListing,
        setSubmittedListing,
    ] = useState<SubmittedListingSummary | null>(
        null,
    );

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [
        isListingsEndpointUnavailable,
        setIsListingsEndpointUnavailable,
    ] = useState(false);

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
                        'Owned listing management is not available from the backend.',
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

                setListings(
                    response.data.items.filter(
                        (listing) =>
                            listing.status === 'ACTIVE'
                            && listing.unit !== 'PER_REQUEST'
                            && listing.quantityRemaining > 0,
                    ),
                );
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

        void loadEligibleListings();

        return () => {
            ignoreResult = true;
        };
    }, [loadVersion]);

    useEffect(() => {
        const query =
            form.recipientQuery.trim();

        setRecipientSearchError(null);
        setHasRecipientSearchRun(false);

        if (
            selectedRecipient
            && selectedRecipient.email.toLowerCase()
            === query.toLowerCase()
        ) {
            setRecipientResults([]);
            setIsRecipientSearching(false);
            return;
        }

        if (query.length < 3) {
            setRecipientResults([]);
            setIsRecipientSearching(false);
            return;
        }

        const controller =
            new AbortController();

        const timeoutId = window.setTimeout(
            async () => {
                setIsRecipientSearching(true);

                try {
                    const response =
                        await recipientService.searchByEmail(
                            query,
                            controller.signal,
                        );

                    if (
                        !response.ok
                        || !response.data
                    ) {
                        setRecipientResults([]);
                        setRecipientSearchError(
                            getResponseMessage(
                                response.data,
                                'Unable to search registered Recipients.',
                            ),
                        );
                        return;
                    }

                    setRecipientResults(response.data);
                } catch (error) {
                    if (!isAbortError(error)) {
                        setRecipientResults([]);
                        setRecipientSearchError(
                            'Unable to reach AFF while searching Recipients.',
                        );
                    }
                } finally {
                    if (!controller.signal.aborted) {
                        setIsRecipientSearching(false);
                        setHasRecipientSearchRun(true);
                    }
                }
            },
            300,
        );

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [
        form.recipientQuery,
        selectedRecipient,
    ]);

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

    const parsedQuantity = parseQuantity(form.quantity);
    const orderTotal = selectedListing && parsedQuantity
        ? selectedListing.price * parsedQuantity
        : 0;
    const parsedCashReceivedAmount =
        parseCashReceivedAmount(form.cashReceivedAmount);
    const cashChange =
        isPriced
        && parsedCashReceivedAmount !== null
        && parsedCashReceivedAmount >= orderTotal
            ? parsedCashReceivedAmount - orderTotal
            : null;

    function clearFieldError(
        field: keyof ManualDonationFieldErrors,
    ) {
        setFieldErrors((current) => ({
            ...current,
            [field]: undefined,
        }));
    }

    function clearSubmissionOutcome() {
        setSubmitError(null);
        setCreatedOrder(null);
        setSubmittedListing(null);
    }

    function setRecipientQuery(
        nextQuery: string,
    ) {
        setForm((current) => ({
            ...current,
            recipientQuery: nextQuery,
        }));

        setSelectedRecipient((current) =>
            current?.email.toLowerCase()
                === nextQuery.trim().toLowerCase()
                ? current
                : null,
        );

        clearFieldError('recipientEmail');
        clearSubmissionOutcome();
    }

    function selectRecipient(
        recipient: RecipientSearchResult,
    ) {
        setSelectedRecipient(recipient);
        setRecipientResults([]);
        setRecipientSearchError(null);
        setHasRecipientSearchRun(false);

        // setForm React local state update function
        setForm((current) => ({
            ...current,
            // find the recipient.email with input
            recipientQuery: recipient.email,
        }));

        clearFieldError('recipientEmail');
        clearSubmissionOutcome();
    }

    function clearRecipientSelection() {
        setSelectedRecipient(null);
        setRecipientResults([]);
        setRecipientSearchError(null);
        setHasRecipientSearchRun(false);

        setForm((current) => ({
            ...current,
            recipientQuery: '',
        }));

        clearFieldError('recipientEmail');
        clearSubmissionOutcome();
    }

    // runs when Donor selects another listing
    function setListingId(nextListingId: string) {
        setForm((current) => ({
            ...current,
            listingId: nextListingId,
            cashReceivedAmount: '',
        }));

        clearFieldError('listingId');
        clearFieldError('quantity');
        clearFieldError('cashReceivedAmount');
        clearSubmissionOutcome();
    }

    function setQuantity(
        nextQuantity: string,
    ) {
        setForm((current) => ({
            ...current,
            quantity: nextQuantity,
        }));

        clearFieldError('quantity');
        clearFieldError('cashReceivedAmount');
        clearSubmissionOutcome();
    }

    function setCashReceivedAmount(
        cashReceivedAmount: string,
    ) {
        setForm((current) => ({
            ...current,
            cashReceivedAmount,
        }));

        clearFieldError('cashReceivedAmount');
        clearSubmissionOutcome();
    }

    function assignBadRequestError(
        message: string,
    ) {
        const normalized =
            message.toLowerCase();

        if (normalized.includes('recipient')) {
            setFieldErrors((current) => ({
                ...current,
                recipientEmail: message,
            }));
            return;
        }

        if (normalized.includes('quantity')) {
            setFieldErrors((current) => ({
                ...current,
                quantity: message,
            }));
            return;
        }

        setSubmitError(message);
    }

    async function handleSubmit(
        event: SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setSubmitError(null);
        setCreatedOrder(null);
        setSubmittedListing(null);

        const nextErrors =
            validateForm(
                form,
                selectedRecipient,
                selectedListing,
            );

        setFieldErrors(nextErrors);

        if (
            Object.keys(nextErrors).length > 0
            || !selectedListing
            || !selectedRecipient
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
            const donationPayload: DonorInitiatedDonationPayload = {
                recipientEmail:
                    selectedRecipient.email,
                quantity,
            };

            const response =
                await listingService
                    .createDonorInitiatedDonation(
                        selectedListing.id,
                        donationPayload,
                    );

            if (response.status === 501) {
                setSubmitError(
                    'Manual donations are not available from the backend.',
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
                const message =
                    getResponseMessage(
                        response.data,
                        'The listing or Recipient could not be found.',
                    );

                if (
                    message.toLowerCase().includes(
                        'listing',
                    )
                ) {
                    setFieldErrors((current) => ({
                        ...current,
                        listingId: message,
                    }));
                } else {
                    setFieldErrors((current) => ({
                        ...current,
                        recipientEmail: message,
                    }));
                }

                return;
            }

            if (response.status === 422) {
                const message =
                    getResponseMessage(
                        response.data,
                        'The listing or quantity is not eligible for this donation.',
                    );

                const normalized =
                    message.toLowerCase();

                if (
                    normalized.includes('listing')
                    || normalized.includes('per request')
                    || normalized.includes('per_request')
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
                assignBadRequestError(
                    getResponseMessage(
                        response.data,
                        'Review the donation details and try again.',
                    ),
                );
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

            setSubmittedListing({
                name: selectedListing.name,
                imageUrl:
                    selectedListing.imageUrl,
            });

            setCreatedOrder(response.data);

            const isFree = selectedListing.price === 0;
            if (isFree) {
                toast.success('Donation recorded', {
                    description: `${selectedListing.name} was handed to the Recipient and recorded as completed.`,
                });
            } else {
                // temporary success notification
                toast.success('Cash donation recorded', {
                    description: `${selectedListing.name} was paid and completed in person with ${
                        VND_FORMATTER.format(cashChange ?? 0)
                    } change.`,
                });
            }

            setListings((current) =>
                current.flatMap((listing) => {
                    if (
                        listing.id
                        !== selectedListing.id
                    ) {
                        return [listing];
                    }

                    const quantityRemaining =
                        Math.max(
                            0,
                            listing.quantityRemaining
                            - quantity,
                        );

                    if (quantityRemaining === 0) {
                        return [];
                    }

                    return [{
                        ...listing,
                        quantityRemaining,
                        donatedQuantity:
                            listing.donatedQuantity
                            + quantity,
                        revenue:
                            listing.revenue
                            + quantity * listing.price,
                    }];
                }),
            );
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
        setSelectedRecipient(null);
        setRecipientResults([]);
        setRecipientSearchError(null);
        setHasRecipientSearchRun(false);
        setFieldErrors({});
        setSubmitError(null);
        setCreatedOrder(null);
        setSubmittedListing(null);
    }

    function retryListings() {
        setLoadVersion((current) =>
            current + 1,
        );
    }

    const canSubmit =
        !isLoading
        && !isSubmitting
        && !createdOrder
        && Object.keys(
            validateForm(
                form,
                selectedRecipient,
                selectedListing,
            ),
        ).length === 0;

    return {
        form,
        listings,
        selectedListing,
        selectedRecipient,
        recipientResults,
        recipientSearchError,
        hasRecipientSearchRun,
        fieldErrors,
        loadError,
        submitError,
        createdOrder,
        submittedListing,
        isLoading,
        isSubmitting,
        isRecipientSearching,
        isPriced,
        orderTotal,
        cashChange,
        isListingsEndpointUnavailable,
        canSubmit,
        setRecipientQuery,
        selectRecipient,
        clearRecipientSelection,
        setListingId,
        setQuantity,
        setCashReceivedAmount,
        handleSubmit,
        clearForm,
        retryListings,
    };
}

export default useManualDonation;
