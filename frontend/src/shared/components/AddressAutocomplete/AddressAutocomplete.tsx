import React, { useState, useEffect, useRef, useId } from 'react';
import './AddressAutocomplete.css';

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

  useEffect(() => {
    setInput(value);
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
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (input === value && suggestions.length === 0) {
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
  }, [input, value]);

  const handleSelect = async (item: NominatimResult) => {
  setInput(item.display_name);
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
            setInput(data.display_name);
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
    <div className="auth-field address-autocomplete" ref={containerRef}>
      <label htmlFor={inputId} className="address-autocomplete-label">
        Address <span className="required">*</span>
      </label>
      <div className="input-wrapper address-autocomplete-input-wrapper">
        <svg
          className="input-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            focusedIndex >= 0 ? `${inputId}-option-${focusedIndex}` : undefined
          }
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Start typing street address..."
        />
        <button
          type="button"
          className="address-autocomplete-gps-btn"
          onClick={handleUseCurrentLocation}
          aria-label="Use current location via GPS"
          title="Use current location via GPS"
        >
          <span aria-hidden="true">📍</span> GPS
        </button>
      </div>

      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          className="helper-text address-autocomplete-status"
        >
          Searching locations...
        </div>
      )}

      {showDropdown && !isLoading && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="address-autocomplete-dropdown"
        >
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <li
                id={`${inputId}-option-${index}`}
                key={item.place_id}
                role="option"
                aria-selected={focusedIndex === index}
                className={`address-autocomplete-item ${
                  focusedIndex === index ? 'is-focused' : ''
                }`}
                onClick={() => handleSelect(item)}
              >
                {item.display_name}
              </li>
            ))
          ) : (
            <li className="address-autocomplete-empty" role="status">
              No matching addresses found.
            </li>
          )}
        </ul>
      )}

      {error ? <small className="error-text">{error}</small> : null}
    </div>
  );
}

export default AddressAutocomplete;