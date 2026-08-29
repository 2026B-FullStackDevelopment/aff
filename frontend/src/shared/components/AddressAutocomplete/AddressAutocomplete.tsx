import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  LoaderCircle,
  LocateFixed,
  MapPin,
} from 'lucide-react';

import { Button } from '@/shared/components/Button/Button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { useNominatimSearch } from '@/shared/hooks/useNominatimSearch';
import { useCurrentLocation } from '@/shared/hooks/useCurrentLocation';

import type { NominatimPlace } from '@/shared/services/nominatim.service';

import { cn } from '@/shared/utils';
import { resolveProvince } from '@/shared/utils/resolveProvince';

export interface LocationData {
  addressText: string;
  latitude: number;
  longitude: number;
  municipality?: string;
  rawAddress?: Record<string, string>;
}

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface AddressAutocompleteProps {
  value: string;
  onSelect: (data: LocationData) => void;
  onInputChange?: (value: string) => void;
  error?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  theme?: ThemeRole;
  className?: string;
}

const themeFocusStyles: Record<
  ThemeRole,
  {
    input: string;
    icon: string;
    button: string;
    suggestionActive: string;
  }
> = {
  admin: {
    input:
      'focus-visible:border-[#5b7bc0] focus-visible:ring-[#5b7bc0]/15',
    icon: 'group-focus-within/field:text-[#5b7bc0]',
    button:
      'border-slate-200 text-[#5b7bc0] hover:border-[#5b7bc0] hover:bg-[#5b7bc0]/10 focus-visible:ring-[#5b7bc0]/30',
    suggestionActive: 'bg-[#5b7bc0]/10 text-[#5b7bc0] font-medium',
  },
  recipient: {
    input:
      'focus-visible:border-[#3D6852] focus-visible:ring-[#3D6852]/15',
    icon: 'group-focus-within/field:text-[#3D6852]',
    button:
      'border-slate-200 text-[#3D6852] hover:border-[#3D6852] hover:bg-[#3D6852]/10 focus-visible:ring-[#3D6852]/30',
    suggestionActive: 'bg-[#3D6852]/10 text-[#3D6852] font-medium',
  },
  donor: {
    input:
      'focus-visible:border-[#805300] focus-visible:ring-[#805300]/15',
    icon: 'group-focus-within/field:text-[#805300]',
    button:
      'border-slate-200 text-[#805300] hover:border-[#805300] hover:bg-[#805300]/10 focus-visible:ring-[#805300]/30',
    suggestionActive: 'bg-[#805300]/10 text-[#805300] font-medium',
  },
};

export function AddressAutocomplete({
  value,
  onSelect,
  onInputChange,
  error,
  id: customId,
  label = 'Address',
  placeholder = 'Start typing a street address...',
  required = true,
  theme = 'admin',
  className,
}: AddressAutocompleteProps) {
  const currentTheme =
    themeFocusStyles[theme] || themeFocusStyles.admin;
  const generatedId = useId();
  const inputId =
    customId ?? `address-input-${generatedId}`;
  const listboxId =
    `address-listbox-${generatedId}`;

  const formErrorId = error
    ? `${inputId}-error`
    : undefined;

  const searchErrorId =
    `${inputId}-search-error`;

  const locationErrorId =
    `${inputId}-location-error`;

  const [input, setInput] =
    useState(value);

  const [showDropdown, setShowDropdown] =
    useState(false);

  const [focusedIndex, setFocusedIndex] =
    useState(-1);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const skipNextSearchRef =
    useRef(true);

  const previousValueRef =
    useRef(value);

  const {
    setQuery,
    results: suggestions,
    isLoading: isSearchLoading,
    error: searchError,
    clear,
  } = useNominatimSearch({
    countrycodes: 'vn',
    debounceMs: 400,
    minQueryLength: 3,
  });

  const {
    getCurrentLocation,
    isLoading: isGpsLoading,
    error: locationError,
    clearError: clearLocationError,
  } = useCurrentLocation();

  const isLoading =
    isSearchLoading || isGpsLoading;

  // Synchronise local input state when the controlled value changes externally.
  useEffect(() => {
    if (
      previousValueRef.current === value
    ) {
      return;
    }

    previousValueRef.current = value;

    if (value === input) {
      return;
    }

    skipNextSearchRef.current = true;
    setInput(value);
  }, [input, value]);

  // Close the suggestion dropdown when clicking outside the component.
  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        containerRef.current
        && !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );
    };
  }, []);

  // Trigger the Nominatim search when the user changes the input.
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (input.trim().length < 3) {
      clear();
      setShowDropdown(false);
      setFocusedIndex(-1);
      return;
    }

    setQuery(input);
    setShowDropdown(true);
    setFocusedIndex(-1);
  }, [clear, input, setQuery]);

  function applyLocation(
    addressText: string,
    latitude: number,
    longitude: number,
    rawAddress?: Record<string, string>,
  ) {
    skipNextSearchRef.current = true;

    setInput(addressText);

    clear();
    clearLocationError();

    setShowDropdown(false);
    setFocusedIndex(-1);

    onSelect({
      addressText,
      latitude,
      longitude,
      municipality: resolveProvince(
        rawAddress,
        latitude,
        longitude,
      ),
      rawAddress,
    });
  }

  function handleSelect(
    item: NominatimPlace,
  ) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);

    applyLocation(
      item.display_name,
      latitude,
      longitude,
      item.address,
    );
  }

  function handleInputChange(
    nextValue: string,
  ) {
    clearLocationError();

    setInput(nextValue);
    setShowDropdown(true);
    setFocusedIndex(-1);

    onInputChange?.(nextValue);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Escape') {
      setShowDropdown(false);
      setFocusedIndex(-1);
      return;
    }

    if (
      !showDropdown
      || suggestions.length === 0
    ) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setFocusedIndex((current) =>
        current < suggestions.length - 1
          ? current + 1
          : 0,
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setFocusedIndex((current) =>
        current > 0
          ? current - 1
          : suggestions.length - 1,
      );

      return;
    }

    if (
      event.key === 'Enter'
      && focusedIndex >= 0
    ) {
      event.preventDefault();
      handleSelect(suggestions[focusedIndex]);
    }
  }

  async function handleUseCurrentLocation() {
    const location =
      await getCurrentLocation();

    if (!location) {
      return;
    }

    applyLocation(
      location.addressText,
      location.latitude,
      location.longitude,
      location.rawAddress,
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col gap-1.5"
    >
      <Label
        htmlFor={inputId}
        className="select-none text-[0.75rem] font-bold uppercase tracking-wider text-slate-600"
      >
        {label}

        {required && (
          <span className="text-red-600">
            {' '}*
          </span>
        )}
      </Label>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 group/field">
          <MapPin
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 transition-colors duration-200 ease-out",
              currentTheme.icon,
            )}
            aria-hidden="true"
          />

          <Input
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={
              focusedIndex >= 0
                ? `${inputId}-option-${focusedIndex}`
                : undefined
            }
            aria-invalid={Boolean(
              error
              || searchError
              || locationError,
            )}
            aria-describedby={
              [
                formErrorId,
                searchError
                  ? searchErrorId
                  : undefined,
                locationError
                  ? locationErrorId
                  : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            aria-busy={isLoading}
            required={required}
            value={input}
            onChange={(event) =>
              handleInputChange(
                event.target.value,
              )
            }
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim().length >= 3) {
                setShowDropdown(true);
              }
            }}
            placeholder={placeholder}
            autoComplete="street-address"
            className={cn(
              "h-11 rounded-lg border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-gray-400 transition-all duration-200 ease-out focus-visible:ring-4 focus-visible:ring-offset-0",
              currentTheme.input,
              className,
            )}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isGpsLoading}
          aria-label="Use current location"
          title="Use current location"
          className={cn(
            "h-11 shrink-0 rounded-lg border bg-white px-3 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
            currentTheme.button,
          )}
        >
          {isGpsLoading ? (
            <LoaderCircle
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LocateFixed
              className="size-4"
              aria-hidden="true"
            />
          )}

          <span className="hidden sm:inline">
            Current
          </span>
        </Button>
      </div>

      {isSearchLoading && (
        <p
          role="status"
          className="text-xs text-slate-400"
        >
          Searching locations…
        </p>
      )}

      {showDropdown && !isLoading && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.length > 0 ? (
            suggestions.map(
              (item, index) => (
                <li
                  id={`${inputId}-option-${index}`}
                  key={item.place_id}
                  role="option"
                  aria-selected={
                    focusedIndex === index
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(item);
                  }}
                  className={cn(
                    'cursor-pointer border-b border-slate-100 px-4 py-2.5 text-sm leading-5 text-slate-700 transition-colors last:border-b-0',
                    focusedIndex === index
                      ? currentTheme.suggestionActive
                      : 'hover:bg-slate-50',
                  )}
                >
                  {item.display_name}
                </li>
              ),
            )
          ) : (
            <li
              role="status"
              className="px-4 py-3 text-center text-sm text-slate-500"
            >
              No matching addresses found.
            </li>
          )}
        </ul>
      )}

      {searchError && (
        <p
          id={searchErrorId}
          role="alert"
          className="text-xs font-semibold text-red-600"
        >
          Location search is currently unavailable.
          Please try again later.
        </p>
      )}

      {locationError && (
        <p
          id={locationErrorId}
          role="alert"
          className="text-xs font-semibold text-red-600"
        >
          {locationError}
        </p>
      )}

      {error && (
        <p
          id={formErrorId}
          className="text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressAutocomplete;