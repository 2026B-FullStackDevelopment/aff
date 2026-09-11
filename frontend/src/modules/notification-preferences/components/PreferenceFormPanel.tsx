import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { FilterChip } from '@/shared/components/FilterChip/FilterChip';
import { IconField } from '@/shared/components/IconField/IconField';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { SwitchField } from '@/shared/components/SwitchField/SwitchField';
import { Panel } from '@/shared/components/Panel/Panel';
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { notificationPreferenceService } from '../services/notificationPreference.service';
import { useNotificationPreferenceForm } from '../hooks/useNotificationPreferenceForm';
import type { FoodCategory, NotificationPreference } from '@/types/api';

const VISIBLE_CATEGORY_COUNT = 4;

interface PreferenceFormPanelProps {
  mode: 'create' | 'edit';
  preference?: NotificationPreference;
  onClose: () => void;
  onSaved: (preference: NotificationPreference) => void;
  /** Edit mode only — parent owns the confirmation dialog and the actual DELETE call. */
  onDeleteRequest?: () => void;
}

export function PreferenceFormPanel({ mode, preference, onClose, onSaved, onDeleteRequest }: PreferenceFormPanelProps) {
  const {
    form,
    error: validationError,
    setTitle,
    toggleCategory,
    setPriceMin,
    setPriceMax,
    setCity,
    setVegetarianOnly,
    validateAndBuildPayload,
  } = useNotificationPreferenceForm(preference);

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleCategories = showAllCategories
    ? CATEGORY_OPTIONS
    : CATEGORY_OPTIONS.slice(0, VISIBLE_CATEGORY_COUNT);
  const hasMoreCategories = CATEGORY_OPTIONS.length > VISIBLE_CATEGORY_COUNT;

  function handleCancel() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    const payload = validateAndBuildPayload();
    if (!payload) return; // validation error is already set by the hook

    setServerError(null);
    setIsSubmitting(true);

    try {
      const response =
        mode === 'create'
          ? await notificationPreferenceService.create(payload)
          : await notificationPreferenceService.update(preference!.id, payload);

      if (!response.ok || !response.data) {
        setServerError(
          response.status === 403
            ? 'Only Premium Recipients can manage notification preferences.'
            : 'Could not save this preference. Please try again.',
        );
        return;
      }

      onSaved(response.data);
    } catch {
      setServerError('Could not save this preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel
      className="h-fit w-full shrink-0 lg:sticky lg:top-6 lg:w-80"
      contentClassName="max-h-[80vh] overflow-y-auto"
      title={mode === 'create' ? 'New Preference Form' : 'Edit Preference'}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleCancel}
          aria-label="Close form"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <IconField
          id="preferenceTitle"
          name="preferenceTitle"
          label="Alert Name"
          required
          theme="recipient"
          placeholder="e.g., Weekly Groceries"
          value={form.preferenceTitle}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div>
          <FormSectionHeader title="Categories" theme="recipient" />
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                theme="recipient"
                selected={form.categories.includes(option.value as FoodCategory)}
                onClick={() => toggleCategory(option.value as FoodCategory)}
              />
            ))}

            {hasMoreCategories && (
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors duration-150 hover:text-slate-700"
              >
                {showAllCategories ? 'Less' : 'More'}
              </button>
            )}
          </div>
        </div>

        <SwitchField
          id="vegetarianOnly"
          label="Vegetarian Only"
          description="Filter out non-vegetarian items"
          theme="recipient"
          checked={form.vegetarianOnly}
          onCheckedChange={setVegetarianOnly}
        />

        <div>
          <FormSectionHeader title="VND Price Range" theme="recipient" />
          <div className="flex items-center gap-2">
            <IconField
              id="priceMin"
              name="priceMin"
              type="number"
              min={0}
              placeholder="Min"
              aria-label="Minimum price"
              theme="recipient"
              value={form.priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
            <span className="shrink-0 text-slate-300">—</span>
            <IconField
              id="priceMax"
              name="priceMax"
              type="number"
              min={0}
              placeholder="Max"
              aria-label="Maximum price"
              theme="recipient"
              value={form.priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
          </div>
        </div>

        <SelectField
          id="city"
          name="city"
          label="City / Region"
          theme="recipient"
          placeholder="Any city"
          options={VIETNAM_PROVINCES}
          value={form.city ?? ''}
          onChange={(event) => setCity(event.target.value || null)}
        />

        <FormErrorAlert message={validationError ?? serverError} />

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <div>
                {mode === 'edit' && onDeleteRequest && (
                <button
                    type="button"
                    onClick={onDeleteRequest}
                    disabled={isSubmitting}
                    className="text-sm font-semibold text-red-600 transition-colors duration-150 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Delete
                </button>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}
                className="h-10 px-4 border-[#3D6852]/30 text-[#2E5A47] transition-all duration-200 ease-out hover:bg-[#f0f7f3] hover:shadow-md active:scale-[0.98]">
                Cancel
                </Button>
                <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}
                className="h-10 px-4 bg-[#3D6852] text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]">
                {isSubmitting ? 'Saving…' : mode === 'create' ? 'Save Preference' : 'Save Changes'}
                </Button>
            </div>
        </div>
      </div>
    </Panel>
  );
}

export default PreferenceFormPanel;
