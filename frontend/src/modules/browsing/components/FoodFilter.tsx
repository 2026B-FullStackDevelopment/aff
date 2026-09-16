// DEVIATION NOTE: the original FoodFilter was just the search input. The
// Marketplace page needs a search box + a "Filters" toggle sitting on the
// same toolbar row, with everything below (city/category/price/sort)
// living in a separate slide-in panel — see FoodFilterPanel.tsx. Splitting
// it this way keeps this file matching its original single concern
// (top-of-page filtering entry point) instead of growing into one
// oversized component.
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { IconField } from '@/shared/components/IconField';
import { cn } from '@/shared/utils';

interface FoodFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}

export function FoodFilter({ search, onSearchChange, isPanelOpen, onTogglePanel }: FoodFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <IconField
          id="food-search-input"
          name="search"
          icon={Search}
          theme="recipient"
          placeholder="Search items..."
          aria-label="Search food listings"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-11"
        />
      </div>

      <Button
        type="button"
        onClick={onTogglePanel}
        aria-pressed={isPanelOpen}
        className={cn(
          'flex h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98]',
          isPanelOpen
            ? 'border-[#3D6852] bg-[#3D6852] text-white'
            : 'border-slate-200 bg-white text-[#414844] hover:bg-slate-50 hover:shadow-md',
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
      </Button>
    </div>
  );
}

export default FoodFilter;
