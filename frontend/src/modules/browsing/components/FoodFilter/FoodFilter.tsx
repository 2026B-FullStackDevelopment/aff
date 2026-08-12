import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useFoodFilter } from './useFoodFilter';

export interface FilterState {
  search?: string;
  [key: string]: unknown;
}

interface FoodFilterProps {
  filters: FilterState;
  onChange: (updatedFilters: FilterState) => void;
}

export function FoodFilter({ filters, onChange }: FoodFilterProps) {
  const { updateSearch } = useFoodFilter(filters, onChange);

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-md mb-6">
      <Label htmlFor="food-search-input" className="text-xs font-bold uppercase tracking-wider text-slate-600 select-none">
        Search food
      </Label>
      <div className="relative flex items-center group/field">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none transition-colors duration-200 ease-out group-focus-within/field:text-[#3D6852]" />
        <Input
          id="food-search-input"
          type="text"
          value={filters.search || ''}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search by title or description…"
          className="pl-9 h-10 rounded-lg border-slate-200 bg-white text-slate-800 placeholder:text-gray-400 text-sm transition-all duration-200 ease-out focus-visible:border-[#3D6852] focus-visible:ring-4 focus-visible:ring-[#3D6852]/15 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}

export default FoodFilter;
