import { useState } from 'react';
import { Bell, UserRound, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalMobileMenu } from './PortalMobileMenu';
import { PortalNavigationLinks } from './PortalNavigationLinks';

type PortalVariant = 'donor' | 'recipient' | 'admin' | 'courier';

export interface PortalNavItem {
  label: string;
  to?: string;
  end?: boolean;
  disabled?: boolean;
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
  /** Content rendered beneath the bell button. */
  notificationPanel?: React.ReactNode;
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
    header: 'border-admin-nav bg-admin-nav',
    brand: 'text-white',
    activeLink: 'bg-white/10 text-white ring-1 ring-white/20',
    inactiveLink: 'text-white/75 hover:bg-white/10 hover:text-white',
    avatar: 'bg-white/15 text-white ring-white/30',
    iconButton: 'text-white/80 hover:bg-white/10 hover:text-white',
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

        <PortalNavigationLinks
          ariaLabel={`${brandLabel} desktop navigation`}
          items={navItems}
          activeLinkClassName={styles.activeLink}
          inactiveLinkClassName={styles.inactiveLink}
        />

        <div className="hidden md:flex shrink-0 items-center gap-2">
          {(variant === 'recipient' || variant === 'donor') && renderBell()}
          {extraRightActions}
          {renderAvatar()}
        </div>

        <div className="flex md:hidden shrink-0 items-center gap-1">
          {(variant === 'recipient' || variant === 'donor') && renderBell()}
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

      {isMobileMenuOpen && (
        <PortalMobileMenu
          brandLabel={brandLabel}
          items={navItems}
          activeLinkClassName={styles.activeLink}
          inactiveLinkClassName={styles.inactiveLink}
          brandClassName={styles.brand}
          avatar={renderAvatar()}
          avatarAlt={avatarAlt}
          extraRightActions={extraRightActions}
          onNavigate={() => setIsMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}

export default PortalTopNavigation;
