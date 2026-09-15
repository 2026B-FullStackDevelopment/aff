import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './PortalTopNavigation';

interface PortalMobileMenuProps {
  brandLabel: string;
  items: readonly PortalNavItem[];
  activeLinkClassName: string;
  inactiveLinkClassName: string;
  brandClassName: string;
  avatar: React.ReactNode;
  avatarAlt: string;
  extraRightActions?: React.ReactNode;
  onNavigate: () => void;
}

/** Renders the expanded mobile navigation and profile row. */
export function PortalMobileMenu({
  brandLabel,
  items,
  activeLinkClassName,
  inactiveLinkClassName,
  brandClassName,
  avatar,
  avatarAlt,
  extraRightActions,
  onNavigate,
}: PortalMobileMenuProps) {
  return (
    <div className="border-t border-black/5 md:hidden">
      <nav
        className="flex flex-col space-y-1 px-2 pb-3 pt-2"
        aria-label={`${brandLabel} mobile navigation`}
      >
        {items.map((item) =>
          item.disabled || !item.to ? (
            <span
              key={`${item.label}-disabled`}
              aria-disabled="true"
              className="block cursor-not-allowed rounded-md px-3 py-2 text-base font-medium text-white/40"
            >
              {item.label}
              <span className="ml-2 text-xs font-normal">Coming soon</span>
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'block rounded-md px-3 py-2 text-base font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                  isActive ? activeLinkClassName : inactiveLinkClassName,
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-black/5 p-4">
        {avatar}
        <span className={`min-w-0 flex-1 truncate text-sm font-medium ${brandClassName}`}>
          {avatarAlt}
        </span>
        {extraRightActions}
      </div>
    </div>
  );
}

