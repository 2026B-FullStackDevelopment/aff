import { Search } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { IconField } from '@/shared/components/IconField/IconField';
import { Panel } from '@/shared/components/Panel/Panel';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import type { FoodCategory } from '@/types/api';
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { ORDER_OPTIONS } from '@/shared/constants/sort';
import type {
  ListingGroup,
  ListingSortField,
  SortDirection,
} from '../types';

interface DonorListingFiltersProps {
  search: string;
  group: ListingGroup;
  category?: FoodCategory;
  from: string;
  to: string;
  sort: ListingSortField;
  order: SortDirection;
  dateError?: string | null;
  onSearchChange: (value: string) => void;
  onGroupChange: (group: ListingGroup) => void;
  onCategoryChange: (
    category: FoodCategory | '',
  ) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSortChange: (
    sort: ListingSortField,
  ) => void;
  onOrderChange: (
    order: SortDirection,
  ) => void;
}

const SORT_OPTIONS = [
  {
    label: 'Created date',
    value: 'createdAt',
  },
  {
    label: 'Revenue',
    value: 'revenue',
  },
];

// Renders URL-backed listing search and filter controls.
export function DonorListingFilters({
  search,
  group,
  category,
  from,
  to,
  sort,
  order,
  dateError,
  onSearchChange,
  onGroupChange,
  onCategoryChange,
  onFromChange,
  onToChange,
  onSortChange,
  onOrderChange,
}: DonorListingFiltersProps) {
  return (
    <div className="space-y-3">
      <div
        className="flex w-full justify-start sm:justify-end"
        role="group"
        aria-label="Listing group"
      >
        <div className="inline-flex rounded-lg border border-[#E4E2E1] bg-white p-1">
          <Button
            type="button"
            variant="ghost"
            aria-pressed={group === 'ACTIVE'}
            onClick={() => onGroupChange('ACTIVE')}
            className={
              group === 'ACTIVE'
                ? 'h-9 bg-[#805300] px-4 text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:text-white active:scale-[0.98]'
                : 'h-9 px-4 text-[#414844] transition-all duration-200 ease-out hover:bg-[#FFF6E3] active:scale-[0.98]'
            }
          >
            Active
          </Button>

          <Button
            type="button"
            variant="ghost"
            aria-pressed={group === 'PAST'}
            onClick={() => onGroupChange('PAST')}
            className={
              group === 'PAST'
                ? 'h-9 bg-[#805300] px-4 text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:text-white active:scale-[0.98]'
                : 'h-9 px-4 text-[#414844] transition-all duration-200 ease-out hover:bg-[#FFF6E3] active:scale-[0.98]'
            }
          >
            Past
          </Button>
        </div>
      </div>

      <Panel contentClassName="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <IconField
              id="listingSearch"
              name="listingSearch"
              type="search"
              label="Listing name"
              icon={Search}
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="Search listing name…"
              autoComplete="off"
              theme="donor"
              className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
            />
          </div>

          <SelectField
            id="listingCategoryFilter"
            name="listingCategoryFilter"
            label="Food category"
            options={CATEGORY_OPTIONS}
            placeholder="All categories"
            value={category ?? ''}
            onChange={(event) =>
              onCategoryChange(
                event.target.value as
                  | FoodCategory
                  | '',
              )
            }
            theme="donor"
            className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <IconField
            id="listingFromDate"
            name="listingFromDate"
            type="date"
            label="Created from"
            value={from}
            onChange={(event) =>
              onFromChange(event.target.value)
            }
            theme="donor"
            className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <IconField
            id="listingToDate"
            name="listingToDate"
            type="date"
            label="Created to"
            value={to}
            onChange={(event) =>
              onToChange(event.target.value)
            }
            theme="donor"
            className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <SelectField
            id="listingSort"
            name="listingSort"
            label="Sorted by"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(event) =>
              onSortChange(
                event.target.value as
                  ListingSortField,
              )
            }
            theme="donor"
            className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
          />

          <SelectField
            id="listingSortDirection"
            name="listingSortDirection"
            label="Direction"
            options={ORDER_OPTIONS}
            value={order}
            onChange={(event) =>
              onOrderChange(
                event.target.value as
                  SortDirection,
              )
            }
            theme="donor"
            className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
          />
        </div>

        {dateError && (
          <p
            className="mt-3 text-xs font-semibold text-red-600"
            role="alert"
          >
            {dateError}
          </p>
        )}
      </Panel>
    </div>
  );
}

export default DonorListingFilters;