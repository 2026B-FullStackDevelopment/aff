import {
    AtSign,
    LoaderCircle,
    PackageOpen,
    Scale,
} from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { IconField } from '@/shared/components/IconField/IconField';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Panel } from '@/shared/components/Panel/Panel';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { Toast } from '@/shared/components/Toast/Toast';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import type {
    ListingUnit,
    PaymentMethod,
} from '@/types/api';
import { useManualDonation } from '../../hooks/useManualDonation';

const PAYMENT_METHOD_OPTIONS = [
    {
        label: 'Stripe checkout',
        value: 'STRIPE',
    },
    {
        label: 'Cash on delivery',
        value: 'CASH',
    },
];

const UNIT_LABELS: Record<ListingUnit, string> = {
    KILOGRAM: 'kg',
    GRAM: 'g',
    LITER: 'L',
    MILLILITER: 'mL',
    UNIT: 'units',
    PER_REQUEST: 'per request',
};

const VND_FORMATTER = new Intl.NumberFormat(
    'vi-VN',
    {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    },
);

const QUANTITY_FORMATTER =
    new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
    });

// Renders the documented C3 manual-donation form.
export function ManualDonationForm() {
    const {
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
        setListingId,
        setQuantity,
        setPaymentMethod,
        handleSubmit,
        clearForm,
        retryListings,
    } = useManualDonation();

    const listingOptions = listings.map(
        (listing) => ({
            value: listing.id,
            label:
                `${listing.name} — `
                + `${QUANTITY_FORMATTER.format(
                    listing.quantityRemaining,
                )} ${UNIT_LABELS[listing.unit]} remaining`,
        }),
    );

    const isFreeDonation =
        createdOrder?.paymentStatus === 'FREE';

    // C3 requires a selected registered Recipient.
    // No Donor-authorized lookup endpoint is documented yet.
    const isRecipientLookupAvailable = false;

    return (
        <div className="space-y-4">
            {createdOrder && (
                <Toast
                    variant={
                        isFreeDonation
                            ? 'success'
                            : 'warning'
                    }
                    title={
                        isFreeDonation
                            ? 'Donation recorded'
                            : 'Recipient action required'
                    }
                    message={
                        isFreeDonation
                            ? `${createdOrder.listing.name} is recorded and ready for the delivery queue.`
                            : `${createdOrder.listing.name} is recorded, but the Recipient must complete the payment step before it is finalized.`
                    }
                    imageUrl={createdOrder.listing.imageUrl}
                    className="max-w-none"
                />
            )}

            <form
                onSubmit={handleSubmit}
                aria-busy={isSubmitting}
                noValidate
            >
                <Panel
                    title="Donation Details"
                    description="Record food committed to a registered AFF Recipient."
                    className="shadow-sm"
                    contentClassName="space-y-7 p-5 sm:p-7"
                >
                    <section>
                        <FormSectionHeader
                            title="Recipient Details"
                            theme="donor"
                        />

                        <IconField
                            id="manualDonationRecipientEmail"
                            name="recipientEmail"
                            type="email"
                            label="Recipient email"
                            required
                            icon={AtSign}
                            value={form.recipientQuery}
                            onChange={(event) =>
                                setRecipientQuery(
                                    event.target.value,
                                )
                            }
                            placeholder="recipient@example.com"
                            autoComplete="off"
                            spellCheck={false}
                            error={fieldErrors.recipientEmail}
                            helperText="Search by email, not username. A registered Recipient must be selected from lookup results."
                            theme="donor"
                            className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
                        />

                        {!isRecipientLookupAvailable && (
                            <WarningCallout
                                title="Recipient search is temporarily unavailable"
                                className="mt-4"
                            >
                                <p>
                                    The documented recipient-email lookup
                                    endpoint has not been provided yet. You
                                    can review the form, but recording remains
                                    disabled until a registered Recipient can
                                    be verified.
                                </p>
                            </WarningCallout>
                        )}
                    </section>

                    <section>
                        <FormSectionHeader
                            title="Donation Items"
                            theme="donor"
                        />

                        {isLoading && (
                            <LoadingSkeleton count={1} />
                        )}

                        {!isLoading && loadError && (
                            <ErrorState
                                title={
                                    isListingsEndpointUnavailable
                                        ? 'Backend endpoint not implemented'
                                        : 'Unable to load listings'
                                }
                                message={loadError}
                                retryLabel="Try Again"
                                onRetry={retryListings}
                            />
                        )}

                        {!isLoading
                            && !loadError
                            && listings.length === 0 && (
                                <EmptyState
                                    title="No eligible listings"
                                    description="Create or resume an active listing with remaining quantity before recording a manual donation."
                                    icon={PackageOpen}
                                />
                            )}

                        {!isLoading
                            && !loadError
                            && listings.length > 0 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
                                        <SelectField
                                            id="manualDonationListing"
                                            name="listingId"
                                            label="Food listing"
                                            required
                                            options={listingOptions}
                                            placeholder="Choose a food package"
                                            value={form.listingId}
                                            onChange={(event) =>
                                                setListingId(
                                                    event.target.value,
                                                )
                                            }
                                            error={fieldErrors.listingId}
                                            theme="donor"
                                            className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
                                        />

                                        <IconField
                                            id="manualDonationQuantity"
                                            name="quantity"
                                            type="number"
                                            label="Quantity"
                                            required
                                            icon={Scale}
                                            min="0"
                                            max={
                                                selectedListing
                                                    ? selectedListing.quantityRemaining
                                                    : undefined
                                            }
                                            step="any"
                                            inputMode="decimal"
                                            value={form.quantity}
                                            onChange={(event) =>
                                                setQuantity(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="1"
                                            error={fieldErrors.quantity}
                                            theme="donor"
                                            className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
                                        />
                                    </div>

                                    {selectedListing && (
                                        <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[#E4E2E1] bg-[#FBF9F8] p-4 text-sm sm:grid-cols-3">
                                            <div>
                                                <dt className="font-semibold text-[#6B7280]">
                                                    Remaining
                                                </dt>

                                                <dd className="mt-1 font-bold text-[#1B1C1C]">
                                                    {QUANTITY_FORMATTER.format(
                                                        selectedListing.quantityRemaining,
                                                    )}{' '}
                                                    {UNIT_LABELS[selectedListing.unit]}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="font-semibold text-[#6B7280]">
                                                    Ration limit
                                                </dt>

                                                <dd className="mt-1 font-bold text-[#1B1C1C]">
                                                    {selectedListing.rationLimitPerPerson
                                                        === null
                                                        ? 'No limit'
                                                        : `${QUANTITY_FORMATTER.format(
                                                            selectedListing.rationLimitPerPerson,
                                                        )} ${UNIT_LABELS[
                                                        selectedListing.unit
                                                        ]
                                                        }`}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="font-semibold text-[#6B7280]">
                                                    Price
                                                </dt>

                                                <dd className="mt-1 font-bold text-[#1B1C1C]">
                                                    {selectedListing.price === 0
                                                        ? 'Free'
                                                        : VND_FORMATTER.format(
                                                            selectedListing.price,
                                                        )}
                                                </dd>
                                            </div>
                                        </dl>
                                    )}

                                    {isPriced && (
                                        <div className="space-y-4">
                                            <SelectField
                                                id="manualDonationPaymentMethod"
                                                name="paymentMethod"
                                                label="Payment method"
                                                required
                                                options={PAYMENT_METHOD_OPTIONS}
                                                placeholder="Select payment method"
                                                value={form.paymentMethod}
                                                onChange={(event) =>
                                                    setPaymentMethod(
                                                        event.target.value as PaymentMethod | '',
                                                    )
                                                }
                                                error={fieldErrors.paymentMethod}
                                                theme="donor"
                                                className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
                                            />

                                            <WarningCallout title="Payment required">
                                                <p>
                                                    The Recipient will be notified
                                                    that payment is required. This
                                                    donation remains pending until
                                                    the payment step is completed.
                                                </p>
                                            </WarningCallout>
                                        </div>
                                    )}
                                </div>
                            )}
                    </section>

                    <FormErrorAlert message={submitError} />

                    <div className="flex flex-col-reverse gap-3 border-t border-[#E4E2E1] pt-5 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={clearForm}
                            disabled={isSubmitting}
                            className="h-11 border-[#C1C8C2] px-5 text-[#805300] transition-all duration-200 ease-out hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                        >
                            {createdOrder
                                ? 'Record another'
                                : 'Clear Form'}
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                !canSubmit
                                || !isRecipientLookupAvailable
                            }
                            className="h-11 bg-[#805300] px-6 font-bold text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoaderCircle
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                    Recording donation…
                                </>
                            ) : (
                                'Record Donation'
                            )}
                        </Button>
                    </div>
                </Panel>
            </form>
        </div>
    );
}

export default ManualDonationForm;