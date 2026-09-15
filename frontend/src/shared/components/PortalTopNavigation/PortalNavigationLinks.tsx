import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './PortalTopNavigation';

interface PortalNavigationLinksProps {
  ariaLabel: string;
  items: readonly PortalNavItem[];
  activeLinkClassName: string;
  inactiveLinkClassName: string;
}

/** Renders the desktop portal links, including visibly disabled future areas. */
export function PortalNavigationLinks({
  ariaLabel,
  items,
  activeLinkClassName,
  inactiveLinkClassName,
}: PortalNavigationLinksProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="mx-4 hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex"
    >
      <ul className="flex min-w-max items-center justify-center gap-1">
        {items.map((item) => (
          <li key={`${item.label}-${item.to ?? 'disabled'}`}>
            {item.disabled || !item.to ? (
              <span
                aria-disabled="true"
                title="Coming soon"
                className="block cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-white/40"
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                    isActive ? activeLinkClassName : inactiveLinkClassName,
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

