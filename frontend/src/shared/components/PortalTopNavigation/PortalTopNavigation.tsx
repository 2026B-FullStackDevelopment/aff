import { useState } from 'react';
import { Bell, UserRound, Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

type PortalVariant = 'donor' | 'recipient' | 'admin' | 'courier';

export interface PortalNavItem {
  label: string;
  to: string;
  end?: boolean;
}

interface PortalTopNavigationProps {
  variant: PortalVariant;
  brandLabel: string;
  brandTo: string;
  navItems: readonly PortalNavItem[];
  avatarUrl?: string | null;
  avatarAlt?: string;
  hasUnreadNotification?: boolean;
  onNotificationsClick?: () => void;
  /**
   * Rendered anchored beneath the bell button (e.g. the Premium upsell
   * today, a live notification feed later per SRS 5.3.2). Content-agnostic
   * — this component only provides the anchor point.
   */
  notificationPanel?: React.ReactNode;
  /** For aria-expanded on the bell button only — open/closed state itself is owned by the caller. */
  isNotificationPanelOpen?: boolean;
  profileTo?: string;
  extraRightActions?: React.ReactNode;
}

const VARIANT_STYLES: Record<
  PortalVariant,
  {
    header: string;
    brand: string;
    activeLink: string;
    inactiveLink: string;
    avatar: string;
    iconButton: string;
  }
> = {
  donor: {
    header: 'border-[#805300] bg-[#805300]',
    brand: 'text-white',
    activeLink: 'bg-white/20 text-white',
    inactiveLink: 'text-white/80 hover:bg-white/10 hover:text-white',
    avatar: 'bg-white/20 text-white',
    iconButton: 'text-white/80 hover:bg-white/10 hover:text-white',
  },
  recipient: {
    header: 'border-[#e9f5ee] bg-[#3D6852]',
    brand: 'text-[#e9f5ee]',
    activeLink: 'bg-[#e9f5ee]/15 text-[#e9f5ee]',
    inactiveLink: 'text-[#e9f5ee] hover:bg-[#e9f5ee]/10 hover:text-[#e9f5ee]/75',
    avatar: 'bg-white text-[#2E5A47]',
    iconButton: 'text-[#e9f5ee] hover:bg-[#e9f5ee]/10 hover:text-[#e9f5ee]/75',
  },
  admin: {
    header: 'border-violet-200 bg-white',
    brand: 'text-violet-700',
    activeLink: 'bg-violet-100 text-violet-800',
    inactiveLink: 'text-slate-600 hover:bg-violet-50 hover:text-violet-700',
    avatar: 'bg-violet-100 text-violet-700',
    iconButton: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  },
  courier: {
    header: 'border-courier-primary bg-courier-primary',
    brand: 'text-white',
    activeLink: 'bg-white/20 text-white',
    inactiveLink: 'text-white/80 hover:bg-white/10 hover:text-white',
    avatar: 'bg-white/20 text-white',
    iconButton: 'text-white/80 hover:bg-white/10 hover:text-white',
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
  notificationPanel,
  isNotificationPanelOpen = false,
  profileTo = '/profile',
  extraRightActions,
}: PortalTopNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const styles = VARIANT_STYLES[variant];

  const renderBell = () => (
    <div className="relative">
      <button
        type="button"
        aria-label={
          hasUnreadNotification
            ? 'Open notifications; unread notifications available'
            : 'Open notifications'
        }
        aria-haspopup={notificationPanel ? 'dialog' : undefined}
        aria-expanded={notificationPanel ? isNotificationPanelOpen : undefined}
        onClick={onNotificationsClick}
        className={`relative rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${styles.iconButton}`}
      >
        <Bell aria-hidden="true" className="size-5" />
        {hasUnreadNotification && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white"
          />
        )}
      </button>

      {notificationPanel}
    </div>
  );

  const renderAvatar = () => (
    <Link
      to={profileTo}
      aria-label="Open profile"
      className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 ${styles.avatar}`}
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
  );

  return (
    <header className={`sticky top-0 z-40 border-b shadow-sm ${styles.header}`}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={brandTo}
          className={`shrink-0 text-lg font-bold ${styles.brand}`}
        >
          {brandLabel}
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label={`${brandLabel} desktop navigation`}
          className="hidden md:flex min-w-0 flex-1 items-center justify-center overflow-x-auto mx-4"
        >
          <ul className="flex min-w-max items-center justify-center gap-1">
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

        {/* Desktop Right Actions */}
        <div className="hidden md:flex shrink-0 items-center gap-2">
          {variant === 'recipient' && renderBell()}
          {extraRightActions}
          {renderAvatar()}
        </div>

        {/* Mobile Toggle & Actions */}
        <div className="flex md:hidden shrink-0 items-center gap-1">
          {variant === 'recipient' && renderBell()}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${styles.iconButton}`}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
            {isMobileMenuOpen ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-black/5">
          <nav className="flex flex-col px-2 pt-2 pb-3 space-y-1" aria-label={`${brandLabel} mobile navigation`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-md px-3 py-2 text-base font-medium transition-colors',
                    isActive ? styles.activeLink : styles.inactiveLink,
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-black/5 p-4 flex items-center gap-3">
            {renderAvatar()}
            <div className="flex flex-col flex-1">
              <span className={`text-sm font-medium ${styles.brand}`}>{avatarAlt}</span>
            </div>
            {extraRightActions}
          </div>
        </div>
      )}
    </header>
  );
}

export default PortalTopNavigation;
