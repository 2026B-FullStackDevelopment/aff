// import notifications & profile icons
import { Bell, UserRound } from 'lucide-react';
// smart link. Active when user is on the page the link is linked to
import { Link, NavLink } from 'react-router-dom';

type PortalVariant = 'donor' | 'recipient' | 'admin' | 'courier';

// Describe one navigation link in the navigation bar
export interface PortalNavItem {
  label: string; // link label
  to: string; // URL opened when the user selects the link.
  end?: boolean; // When true, the link is active only when the current URL exactly matches
}

// Describe the information accepted by PortalTopNavigation.
interface PortalTopNavigationProps {
  variant: PortalVariant; // role-specific color theme
  brandLabel: string; // brandLabel, ie. Donor Portal for Donor
  brandTo: string; // brand URL
  navItems: readonly PortalNavItem[]; // navItems list
  avatarUrl?: string | null;
  avatarAlt?: string;
  hasUnreadNotification?: boolean;
  onNotificationsClick?: () => void;
  profileTo?: string;
}

// Define the Tailwind classes used by each portal variant.

const VARIANT_STYLES: Record<
  PortalVariant,
  {
    header: string; // type of the value containing the Tailwind class name
    brand: string; 
    activeLink: string;
    inactiveLink: string;
    avatar: string;
  }
> = {
  // Donor portal uses an emerald-green visual theme.
  donor: {
    // White header with a light emerald bottom border.
    header: 'border-emerald-200 bg-white',
    // Dark emerald text for the "Donor Portal" brand.
    brand: 'text-emerald-700',
    // Highlight the currently selected donor page.
    activeLink: 'bg-emerald-100 text-emerald-800',
    // Default link appearance and hover state.
    inactiveLink:
      'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
    // Fallback avatar colours when there is no avatar image.
    avatar: 'bg-emerald-100 text-emerald-700',
  },
  recipient: {
    header: 'border-blue-200 bg-white',
    brand: 'text-blue-700',
    activeLink: 'bg-blue-100 text-blue-800',
    inactiveLink: 'text-slate-600 hover:bg-blue-50 hover:text-blue-700',
    avatar: 'bg-blue-100 text-blue-700',
  },
  admin: {
    header: 'border-violet-200 bg-white',
    brand: 'text-violet-700',
    activeLink: 'bg-violet-100 text-violet-800',
    inactiveLink: 'text-slate-600 hover:bg-violet-50 hover:text-violet-700',
    avatar: 'bg-violet-100 text-violet-700',
  },
  courier: {
    header: 'border-amber-200 bg-white',
    brand: 'text-amber-700',
    activeLink: 'bg-amber-100 text-amber-800',
    inactiveLink: 'text-slate-600 hover:bg-amber-50 hover:text-amber-700',
    avatar: 'bg-amber-100 text-amber-700',
  },
};

export function PortalTopNavigation({
  variant,
  brandLabel,
  brandTo,
  navItems,
  avatarUrl,
  avatarAlt = 'Profile',
  hasUnreadNotification = false,
  onNotificationsClick,
  profileTo = '/profile',
}: PortalTopNavigationProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-sm ${styles.header}`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={brandTo}
          className={`shrink-0 text-lg font-bold ${styles.brand}`}
        >
          {brandLabel}
        </Link>

        <nav
          aria-label={`${brandLabel} navigation`}
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <ul className="flex min-w-max items-center gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                      isActive ? styles.activeLink : styles.inactiveLink,
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={
              hasUnreadNotification
                ? 'Open notifications; unread notifications available'
                : 'Open notifications'
            }
            onClick={onNotificationsClick}
            className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Bell aria-hidden="true" className="size-5" />

            {hasUnreadNotification && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            )}
          </button>

          <Link
            to={profileTo}
            aria-label="Open profile"
            className={`flex size-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 ${styles.avatar}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={avatarAlt}
                className="size-full object-cover"
              />
            ) : (
              <>
                <UserRound aria-hidden="true" className="size-5" />
                <span className="sr-only">{avatarAlt}</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default PortalTopNavigation;