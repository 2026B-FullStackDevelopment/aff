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
import {
  nominatimService,
  type NominatimPlace,
} from '@/shared/services/nominatim.service';
import { cn } from '@/shared/utils';
import { resolveProvince } from '@/shared/utils/resolveProvince';

export interface LocationData {
  addressText: string;
  latitude: number;
  longitude: number;
  municipality?: string;
  rawAddress?: Record<string, string>;
}

interface AddressAutocompleteProps {
  value: string;
  onSelect: (data: LocationData) => void;
  onInputChange?: (value: string) => void;
  error?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function AddressAutocomplete({
  value,
  onSelect,
  onInputChange,
  error,
  id: customId,
  label = 'Address',
  placeholder = 'Start typing a street address...',
  required = true,
}: AddressAutocompleteProps) {
  const generatedId = useId();
  const inputId =
    customId ?? `address-input-${generatedId}`;
  const listboxId =
    `address-listbox-${generatedId}`;
  const errorId = error
    ? `${inputId}-error`
    : undefined;

  const [input, setInput] =
    useState(value);
  const [showDropdown, setShowDropdown] =
    useState(false);
  const [focusedIndex, setFocusedIndex] =
    useState(-1);
  const [isGpsLoading, setIsGpsLoading] =
    useState(false);

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
    clear,
  } = useNominatimSearch({
    countrycodes: 'vn',
    debounceMs: 400,
    minQueryLength: 3,
  });

  const isLoading =
    isSearchLoading || isGpsLoading;

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

  function handleSelect(
    item: NominatimPlace,
  ) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const rawAddress = item.address;

    skipNextSearchRef.current = true;
    setInput(item.display_name);
    clear();
    setShowDropdown(false);
    setFocusedIndex(-1);

    onSelect({
      addressText: item.display_name,
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

  function handleInputChange(
    nextValue: string,
  ) {
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

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      window.alert(
        'Geolocation is not supported by this browser.',
      );
      return;
    }

    setIsGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        try {
          const place =
            await nominatimService.reverseGeocode(
              latitude,
              longitude,
            );

          if (!place) {
            window.alert(
              'AFF could not resolve your current address.',
            );
            return;
          }

          skipNextSearchRef.current = true;
          setInput(place.display_name);
          clear();
          setShowDropdown(false);
          setFocusedIndex(-1);

          onSelect({
            addressText: place.display_name,
            latitude,
            longitude,
            municipality: resolveProvince(
              place.address,
              latitude,
              longitude,
            ),
            rawAddress: place.address,
          });
        } catch {
          window.alert(
            'AFF could not retrieve your current address.',
          );
        } finally {
          setIsGpsLoading(false);
        }
      },
      () => {
        setIsGpsLoading(false);

        window.alert(
          'Unable to retrieve your location. Check your browser permissions and try again.',
        );
      },
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
        <div className="relative min-w-0 flex-1">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400"
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
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
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
            className="h-12 border-[#C1C8C2] bg-[#FBF9F8] pl-10 pr-3 text-sm text-[#1B1C1C] transition-all duration-200 focus-visible:border-[#805300] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#805300]/15 focus-visible:ring-offset-0"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isGpsLoading}
          aria-label="Use current location"
          title="Use current location"
          className="h-12 shrink-0 border-[#C1C8C2] bg-white px-3 text-[#805300] hover:border-[#805300] hover:bg-[#FFF6E3]"
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
          className="text-xs text-[#6B7280]"
        >
          Searching locations…
        </p>
      )}

      {showDropdown && !isLoading && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#E4E2E1] bg-white py-1 shadow-xl"
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
                    'cursor-pointer border-b border-[#F1EFED] px-4 py-3 text-sm leading-5 text-[#414844] transition-colors last:border-b-0',
                    focusedIndex === index
                      ? 'bg-[#FFF6E3] text-[#5B3A00]'
                      : 'hover:bg-[#FBF9F8]',
                  )}
                >
                  {item.display_name}
                </li>
              ),
            )
          ) : (
            <li
              role="status"
              className="px-4 py-3 text-center text-sm text-[#6B7280]"
            >
              No matching addresses found.
            </li>
          )}
        </ul>
      )}

      {error && (
        <p
          id={errorId}
          className="text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressAutocomplete;