import React, { useState, useEffect, useRef, useId } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/utils';

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
  error?: string;
  id?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

export function AddressAutocomplete({
  value,
  onSelect,
  error,
  id: customId,
}: AddressAutocompleteProps) {
  const generatedId = useId();
  const inputId = customId || `address-input-${generatedId}`;
  const listboxId = `address-listbox-${generatedId}`;

  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(true);

  useEffect(() => {
    setInput(value);
    skipNextSearchRef.current = true;
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            input
          )}&addressdetails=1&limit=5&countrycodes=vn`,
          {
            headers: {
              'User-Agent': 'AFF-App-Registration/1.0',
            },
          }
        );
        if (response.ok) {
          const data: NominatimResult[] = await response.json();
          setSuggestions(data);
          setShowDropdown(true);
          setFocusedIndex(-1);
        }
      } catch (err) {
        console.error('Failed to fetch address suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [input]);

  const handleSelect = async (item: NominatimResult) => {
    skipNextSearchRef.current = true;
    setInput(item.display_name);
    setSuggestions([]);
    setShowDropdown(false);
    setFocusedIndex(-1);

    const latitude = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);

    let rawAddress = item.address;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json` +
          `&lat=${latitude}` +
          `&lon=${longitude}` +
          `&addressdetails=1` +
          `&zoom=10`,
        {
          headers: {
            'User-Agent': 'AFF-App-Registration/1.0',
          },
        }
      );

      if (response.ok) {
        const reverseData = await response.json();
        rawAddress = reverseData.address;
      }
    } catch (error) {
      console.error('Failed to reverse geocode selected address:', error);
    }

    onSelect({
      addressText: item.display_name,
      latitude,
      longitude,
      rawAddress,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setFocusedIndex(-1);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'AFF-App-Registration/1.0',
              },
            }
          );
          if (response.ok) {
            const data: NominatimResult = await response.json();
            skipNextSearchRef.current = true;
            setInput(data.display_name);
            setSuggestions([]);
            setShowDropdown(false);

            onSelect({
              addressText: data.display_name,
              latitude,
              longitude,
              rawAddress: data.address,
            });
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        } finally {
          setIsLoading(false);
        }
      },
      (geoErr) => {
        console.error('GPS error:', geoErr);
        setIsLoading(false);
        alert('Unable to retrieve location. Please check browser permissions.');
      }
    );
  };

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={containerRef}>
      {/* Label */}
      <Label
        htmlFor={inputId}
        className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-700 select-none"
      >
        Address <span className="text-red-600">*</span>
      </Label>

      {/* Input row */}
      <div className="relative flex items-center gap-2">
        {/* Map-pin icon overlaid on the input */}
        <MapPin
          className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none"
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
            focusedIndex >= 0 ? `${inputId}-option-${focusedIndex}` : undefined
          }
          aria-invalid={Boolean(error)}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Start typing street address..."
          className="flex-1 pl-9 pr-2 h-11 rounded-lg border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-gray-400 text-sm transition-all duration-200 focus-visible:bg-white focus-visible:border-amber-500 focus-visible:ring-4 focus-visible:ring-amber-500/15 focus-visible:ring-offset-0"
        />

        {/* GPS button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          aria-label="Use current location via GPS"
          title="Use current location via GPS"
          className="flex items-center gap-1 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <span aria-hidden="true">📍</span> GPS
        </button>
      </div>

      {/* Loading status */}
      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          className="text-xs text-slate-500 mt-0.5"
        >
          Searching locations…
        </div>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && !isLoading && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <li
                id={`${inputId}-option-${index}`}
                key={item.place_id}
                role="option"
                aria-selected={focusedIndex === index}
                className={cn(
                  'cursor-pointer border-b border-slate-50 px-3 py-2.5 text-sm text-slate-700 leading-snug transition-colors duration-75 last:border-b-0',
                  focusedIndex === index
                    ? 'bg-slate-100 text-slate-900'
                    : 'hover:bg-slate-50'
                )}
                onClick={() => handleSelect(item)}
              >
                {item.display_name}
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-sm text-slate-500 text-center" role="status">
              No matching addresses found.
            </li>
          )}
        </ul>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressAutocomplete;