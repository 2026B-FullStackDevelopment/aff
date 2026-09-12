import { Plus } from 'lucide-react';

interface AddPreferenceCardProps {
  onClick: () => void;
}

export function AddPreferenceCard({ onClick }: AddPreferenceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3D6852]/40 bg-[#f0f7f3] p-5 text-sm font-bold text-[#2E5A47] transition-all duration-200 ease-out hover:border-[#3D6852] hover:bg-[#e9f5ee] active:scale-[0.98]"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#3D6852]">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      Add Preference
    </button>
  );
}

export default AddPreferenceCard;
