import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ListingDetailHeader() {
  return (
    <header className="flex items-center gap-2 bg-[#3D6852] px-6 py-4">
      <Link
        to="/marketplace"
        className="flex items-center gap-2 text-sm font-bold text-[#e9f5ee] transition-colors duration-150 hover:text-[#e9f5ee]/75"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Marketplace
      </Link>
    </header>
  );
}

export default ListingDetailHeader;
