import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ListingDetailHeaderProps {
  /** Where the back link goes. Defaults to the marketplace list. */
  backTo?: string;
  /** Label shown next to the arrow. Defaults to "Marketplace". */
  backLabel?: string;
}

export function ListingDetailHeader({
  backTo = '/marketplace',
  backLabel = 'Marketplace',
}: ListingDetailHeaderProps) {
  return (
    <header className="flex items-center gap-2 bg-[#3D6852] px-6 py-4">
      <Link
        to={backTo}
        className="flex items-center gap-2 text-sm font-bold text-[#e9f5ee] transition-colors duration-150 hover:text-[#e9f5ee]/75"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>
    </header>
  );
}

export default ListingDetailHeader;
