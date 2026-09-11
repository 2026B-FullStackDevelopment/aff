import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  AtSign,
  Banknote,
  Check,
  LoaderCircle,
  PackageOpen,
  Scale,
  TriangleAlert,
  X,
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
import { formatUnit } from '@/shared/constants/units';
import { useManualDonation } from '../hooks/useManualDonation';

const VND_FORMATTER =
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

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
    selectedRecipient,
    recipientResults,
    recipientSearchError,
    hasRecipientSearchRun,
    fieldErrors,
    loadError,
    submitError,
    createdOrder,
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
  } = useManualDonation();

  const generatedId = useId();
  const recipientListboxId =
    `recipient-results-${generatedId}`;

  const [
    isRecipientFieldFocused,
    setIsRecipientFieldFocused,
  ] = useState(false);

  const [
    activeRecipientIndex,
    setActiveRecipientIndex,
  ] = useState(-1);

  useEffect(() => {
    setActiveRecipientIndex(-1);
  }, [recipientResults]);

  const listingOptions =
    listings.map((listing) => ({
      value: listing.id,
      label:
        `${listing.name} — `
        + `${QUANTITY_FORMATTER.format(
          listing.quantityRemaining,
        )} ${formatUnit(listing.unit)} remaining`,
    }));

  const isOverRationLimit =
    selectedListing !== null
    && selectedListing.rationLimitPerPerson !== null
    && parseFloat(form.quantity) > selectedListing.rationLimitPerPerson;

  const showRecipientDropdown =
    isRecipientFieldFocused
    && !selectedRecipient
    && form.recipientQuery.trim().length >= 3;

  function handleRecipientKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Escape') {
      setIsRecipientFieldFocused(false);
      setActiveRecipientIndex(-1);
      return;
    }

    if (recipientResults.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setActiveRecipientIndex(
        (current) =>
          current < recipientResults.length - 1
            ? current + 1
            : 0,
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setActiveRecipientIndex(
        (current) =>
          current > 0
            ? current - 1
            : recipientResults.length - 1,
      );

      return;
    }

    if (
      event.key === 'Enter'
      && activeRecipientIndex >= 0
    ) {
      event.preventDefault();

      selectRecipient(
        recipientResults[
          activeRecipientIndex
        ],
      );

      setIsRecipientFieldFocused(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
        noValidate
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <Panel
              title="Donation Details"
              description="Record food handed directly to a registered AFF Recipient at your premises."
              className="shadow-sm"
              contentClassName="space-y-7 p-5 sm:p-7"
            >
          <section>
            <FormSectionHeader
              title="Recipient Details"
              theme="donor"
            />

            <div className="relative">
              <IconField
                // input field
                id="manualDonationRecipientEmail"
                name="recipientEmail"
                type="email"
                label="Recipient email"
                required
                icon={AtSign}
                value={form.recipientQuery}
                onChange={(event) => {
                  setRecipientQuery(
                    event.target.value,
                  );
                  setIsRecipientFieldFocused(
                    true, // keeps the dropdown list to choose recipient in place
                  );
                }}
                onFocus={() =>
                  setIsRecipientFieldFocused(
                    true,
                  )
                }
                onBlur={() =>
                  window.setTimeout(
                    () =>
                      setIsRecipientFieldFocused(
                        false,
                      ),
                    100,
                  )
                }
                onKeyDown={
                  handleRecipientKeyDown
                }
                placeholder="recipient@example.com"
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={
                  showRecipientDropdown
                }
                aria-controls={
                  recipientListboxId
                }
                aria-activedescendant={
                  activeRecipientIndex >= 0
                    ? `${recipientListboxId}-${activeRecipientIndex}`
                    : undefined
                }
                error={
                  fieldErrors.recipientEmail
                }
                helperText="Enter at least 3 characters, then select a registered Recipient."
                theme="donor"
                className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
              />

              {showRecipientDropdown && (
                <div
                  id={recipientListboxId}
                  role="listbox"
                  aria-label="Registered Recipient results"
                  className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-[#E4E2E1] bg-white shadow-xl"
                >
                  {isRecipientSearching && (
                    <div
                      role="status"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[#6B7280]"
                    >
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />

                      Searching Recipients…
                    </div>
                  )}

                  {!isRecipientSearching
                    && recipientSearchError && (
                      <p
                        role="alert"
                        className="px-4 py-3 text-sm font-medium text-red-700"
                      >
                        {recipientSearchError}
                      </p>
                    )}

                  {!isRecipientSearching
                    && !recipientSearchError
                    && recipientResults.map(
                      (recipient, index) => (
                        <button
                          id={`${recipientListboxId}-${index}`}
                          key={recipient.id}
                          type="button"
                          role="option"
                          aria-selected={
                            activeRecipientIndex
                            === index
                          }
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectRecipient(
                              recipient,
                            );
                            setIsRecipientFieldFocused(
                              false,
                            );
                          }}
                          className={
                            `flex w-full items-center justify-between gap-4 border-b border-[#F1EFED] px-4 py-3 text-left transition-colors last:border-b-0 ${
                              activeRecipientIndex
                                === index
                                ? 'bg-[#FFF6E3]'
                                : 'hover:bg-[#FBF9F8]'
                            }`
                          }
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[#1B1C1C]">
                              {recipient.username}
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-[#6B7280]">
                              {recipient.email}
                            </span>
                          </span>

                          <Check
                            className="size-4 shrink-0 text-[#805300]"
                            aria-hidden="true"
                          />
                        </button>
                      ),
                    )}

                  {!isRecipientSearching
                    && !recipientSearchError
                    && hasRecipientSearchRun
                    && recipientResults.length
                      === 0 && (
                      <p
                        role="status"
                        className="px-4 py-3 text-center text-sm text-[#6B7280]"
                      >
                        No active registered Recipient
                        matches this email.
                      </p>
                    )}
                </div>
              )}
            </div>

            {selectedRecipient && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#D5B77D] bg-[#FFF6E3] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#805300]">
                    <Check
                      className="size-4"
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1B1C1C]">
                      {selectedRecipient.username}
                    </p>

                    <p className="truncate text-xs text-[#6B7280]">
                      {selectedRecipient.email}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={
                    clearRecipientSelection
                  }
                  aria-label="Clear selected Recipient"
                  className="shrink-0 text-[#805300] hover:bg-white"
                >
                  <X
                    className="size-4"
                    aria-hidden="true"
                  />
                </Button>
              </div>
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
                    ? 'Backend endpoint unavailable'
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
                      error={
                        fieldErrors.listingId
                      }
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
                          ? selectedListing
                            .quantityRemaining
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
                      error={
                        fieldErrors.quantity
                      }
                      theme="donor"
                      className="h-12 border-[#C1C8C2] bg-[#FBF9F8]"
                    />
                  </div>

                  {selectedListing && (
                    <dl className="grid grid-cols-1 gap-4 rounded-xl border border-[#E4E2E1] bg-[#FBF9F8] p-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-[#6B7280]">
                          Remaining
                        </dt>

                        <dd className="mt-1 font-bold text-[#1B1C1C]">
                          {QUANTITY_FORMATTER.format(
                            selectedListing
                              .quantityRemaining,
                          )}{' '}
                          {formatUnit(
                            selectedListing.unit,
                          )}
                        </dd>
                      </div>

                      <div
                        className={
                          isOverRationLimit
                            ? 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2'
                            : undefined
                        }
                      >
                        <dt
                          className={
                            isOverRationLimit
                              ? 'flex items-center gap-1 font-semibold text-amber-700'
                              : 'font-semibold text-[#6B7280]'
                          }
                        >
                          {isOverRationLimit && (
                            <TriangleAlert
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          Ration limit
                        </dt>

                        <dd
                          className={
                            isOverRationLimit
                              ? 'mt-1 font-bold text-amber-800'
                              : 'mt-1 font-bold text-[#1B1C1C]'
                          }
                        >
                          {selectedListing
                            .rationLimitPerPerson
                            === null
                            ? 'No limit'
                            : `${QUANTITY_FORMATTER.format(
                              selectedListing
                                .rationLimitPerPerson,
                            )} ${formatUnit(
                              selectedListing.unit,
                            )}`}
                        </dd>

                        {isOverRationLimit && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Quantity exceeds this limit
                          </p>
                        )}
                      </div>

                      <div>
                        <dt className="font-semibold text-[#6B7280]">
                          Price
                        </dt>

                        <dd className="mt-1 font-bold text-[#1B1C1C]">
                          {selectedListing.price
                            === 0
                            ? 'Free'
                            : VND_FORMATTER.format(
                              selectedListing.price,
                            )}
                        </dd>
                      </div>
                    </dl>
                  )}

                </div>
              )}
          </section>

            </Panel>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-80">
            <Panel title="Payment Method" className="shadow-sm">
              <div className="flex flex-col gap-4">
                {isPriced ? (
                  <>
                    <div className="flex items-center gap-3 rounded-xl border border-[#D5B77D] bg-[#FFF6E3] p-4">
                      <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#805300]">
                        {/* cash icon component */}
                        <Banknote className="size-5" aria-hidden="true" /> 
                      </span>

                      <div>
                        <p className="font-bold text-[#1B1C1C]">Cash</p>
                        <p className="text-xs text-[#694400]">
                          The Recipient pays you directly during this in-person donation.
                        </p>
                      </div>                                            
                    </div>

                    {/* input field to input cash received */}
                    <IconField
                      id="manualDonationCashReceived"
                      name="cashReceivedAmount"
                      type="number"
                      label="Cash received"
                      required
                      icon={Banknote}
                      min={orderTotal}
                      step="1"
                      inputMode="numeric"
                      value={form.cashReceivedAmount}
                      onChange={(event) =>
                        setCashReceivedAmount(event.target.value)
                      }
                      placeholder={String(orderTotal)}
                      error={fieldErrors.cashReceivedAmount}
                      helperText="Enter the cash received from the Recipient in VND."
                      theme="donor"
                    />
                  </>
                ) : (
                  <p className="text-sm text-[#6B7280]">
                    {selectedListing
                      ? 'This donation is free. No payment method is required.'
                      : 'Select a listing to see its payment options.'}
                  </p>
                )}

                <dl className="space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-[#414844]">Total</dt>
                    <dd className="text-base font-extrabold text-[#1B1C1C]">
                      {selectedListing
                        ? VND_FORMATTER.format(orderTotal)
                        : '—'}
                    </dd>
                  </div>
                  
                  {/* if the listing is not free */}
                  {isPriced && (
                    <div className="flex items-center justify-between gap-4" aria-live="polite">
                      <dt className="font-semibold text-[#414844]">Change</dt>
                      <dd className="text-base font-extrabold text-[#805300]">
                        {cashChange === null
                          ? '—'
                          : VND_FORMATTER.format(cashChange)}
                      </dd>
                    </div>
                  )}
                </dl>

                <FormErrorAlert message={submitError} />

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-11 w-full bg-[#805300] px-6 font-bold text-white transition-all duration-200 hover:bg-[#694400] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={isSubmitting}
                  className="h-11 w-full border-[#C1C8C2] px-5 text-[#805300] transition-all duration-200 hover:border-[#805300] hover:bg-[#FFF6E3] hover:shadow-md active:scale-[0.98]"
                >
                  {createdOrder
                    ? 'Record another'
                    : 'Clear Form'}
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ManualDonationForm;
