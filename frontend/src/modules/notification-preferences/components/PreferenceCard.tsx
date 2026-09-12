import { Layers, Leaf, Wallet, MapPin, Zap, PauseCircle, Trash2 } from 'lucide-react';
import { CATEGORY_LABELS, formatPrice } from '@/shared/utils/listingFormatting';
import { cn } from '@/shared/utils';
import type { NotificationPreference } from '@/types/api';

interface PreferenceCardProps {
  preference: NotificationPreference;
  /** PATCH and DELETE are Premium-gated — a STANDARD recipient can view but not edit/toggle/delete. */
  isPremium: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleActive: (id: string) => void;
}

function formatPriceRange(priceMin: number | null, priceMax: number | null): string {
  if (priceMin === null && priceMax === null) return 'Any price';
  if (priceMin === null) return `Up to ${formatPrice(priceMax as number)}`;
  if (priceMax === null) return `${formatPrice(priceMin)}+`;
  return `${formatPrice(priceMin)} - ${formatPrice(priceMax)}`;
}

export function PreferenceCard({ preference, isPremium, onEdit, onDelete, onToggleActive }: PreferenceCardProps) {
  const { id, preferenceTitle, categories, vegetarian, priceMin, priceMax, city, isActive } = preference;

  const details = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-[#1B1C1C] flex-1 truncate">{preferenceTitle}</h3>
        {isPremium && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors duration-150 hover:bg-red-50 -mr-1.5 -mt-1 shrink-0"
            aria-label={`Delete ${preferenceTitle}`}
            title="Delete preference"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-[#e9f5ee] px-2 py-0.5 text-xs font-semibold text-[#2E5A47]"
            >
              {CATEGORY_LABELS[category] ?? category}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 text-sm text-[#414844]">
        <span className="flex items-center gap-1.5">
          <Leaf className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
          Vegetarian: {vegetarian ? 'Yes' : 'Any'}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
          Price: {formatPriceRange(priceMin, priceMax)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
          City: {city ?? 'Any'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#E4E2E1] bg-white p-5 shadow-xs transition-shadow duration-200 hover:shadow-sm">
      {isPremium ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEdit();
            }
          }}
          className="rounded-lg text-left transition-opacity duration-150 hover:opacity-85 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D6852]/20"
        >
          {details}
        </div>
      ) : (
        details
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280]">
          {isActive ? (
            <>
              <Zap className="size-3.5 text-[#3D6852]" aria-hidden="true" />
              Active Alert
            </>
          ) : (
            <>
              <PauseCircle className="size-3.5" aria-hidden="true" />
              Paused
            </>
          )}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={isActive ? 'Pause this alert' : 'Activate this alert'}
          disabled={!isPremium}
          onClick={() => onToggleActive(id)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-all duration-200 ease-out cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0 focus-visible:ring-[#3D6852]/25',
            'disabled:cursor-not-allowed disabled:opacity-60',
            isActive ? 'bg-[#3D6852]' : 'bg-slate-300',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm',
              'transition-transform duration-200 ease-out',
              isActive && 'translate-x-5',
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default PreferenceCard;
