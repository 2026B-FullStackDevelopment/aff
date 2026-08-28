import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { CheckboxField } from '@/shared/components/CheckboxField/CheckboxField';
import { FilterChip } from '@/shared/components/FilterChip/FilterChip';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { IconField } from '@/shared/components/IconField/IconField';
import { Panel } from '@/shared/components/Panel/Panel';
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { ORDER_OPTIONS } from '@/shared/constants/sort';
import { cn } from '@/shared/utils';
import { ListingFilters, useFoodFilter } from '../hooks/useFoodFilter';
import { FoodCategory } from '@/types/api';

const VISIBLE_CITY_COUNT = 4;

interface FoodFilterPanelProps {
  filters: ListingFilters;
  onFiltersChange: (patch: Partial<ListingFilters>) => void;
  onClose: () => void;
  /** Cities in display order. */
  cities: string[];
}

export function FoodFilterPanel({ filters, onFiltersChange, onClose, cities }: FoodFilterPanelProps) {
  const { selectCity, selectCategory, setPriceMin, setPriceMax, setSortOrder } = useFoodFilter(
    filters,
    onFiltersChange,
  );

  const [showAllCities, setShowAllCities] = useState(false);
  const visibleCities = showAllCities ? cities : cities.slice(0, VISIBLE_CITY_COUNT);
  const hasMoreCities = cities.length > VISIBLE_CITY_COUNT;

  return (
    <Panel
      className="h-fit w-72 shrink-0 lg:sticky lg:top-6"
      contentClassName="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100vh-6rem)]"
      title="Filter"
      actions={
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close filters">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <FormSectionHeader title="Municipality / City" theme="recipient" />
          <div className="flex flex-wrap gap-2">
            {visibleCities.map((city) => (
              <FilterChip
                key={city}
                label={city}
                theme="recipient"
                selected={filters.city === city}
                onClick={() => selectCity(city)}
              />
            ))}

            {hasMoreCities && (
              <button
                type="button"
                onClick={() => setShowAllCities((prev) => !prev)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors duration-150 hover:text-slate-700"
              >
                More
                <ChevronDown
                  className={cn('size-3.5 transition-transform duration-200', showAllCities && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>

        <div>
          <FormSectionHeader title="Food Category" theme="recipient" />
          <div className="flex flex-col gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <CheckboxField
                key={option.value}
                id={`category-${option.value}`}
                name="category"
                label={option.label}
                theme="recipient"
                checked={filters.category === (option.value as FoodCategory)}
                onChange={() => selectCategory(option.value as FoodCategory)}
              />
            ))}
          </div>
        </div>

        <div>
          <FormSectionHeader title="VND Price Range" theme="recipient" />
          <div className="flex items-center gap-2">
            <IconField
              id="price-min"
              name="priceMin"
              type="number"
              min={0}
              placeholder="Min"
              theme="recipient"
              value={filters.priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
            <span className="text-slate-300">—</span>
            <IconField
              id="price-max"
              name="priceMax"
              type="number"
              min={0}
              placeholder="Max"
              theme="recipient"
              value={filters.priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
          </div>
        </div>

        <div>
          <FormSectionHeader title="Sort by Price" theme="recipient" />
          <div className="flex flex-col gap-2">
            {ORDER_OPTIONS.map((option) => (
              <CheckboxField
                key={option.value}
                id={`sort-${option.value}`}
                name="sortOrder"
                label={option.label}
                theme="recipient"
                checked={filters.sortOrder === option.value}
                onChange={() => setSortOrder(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default FoodFilterPanel;
