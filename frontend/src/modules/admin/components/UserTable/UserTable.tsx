import type { AnyUserDTO, UserDTO, UserRole } from '@/types/api';
import { cn } from '@/shared/utils';
import { AccountStatusControl } from '../AccountStatusControl/AccountStatusControl';

interface UserTableProps {
  users: AnyUserDTO[];
  pendingUserIds: Set<string>;
  onStatusChange: (userId: string, status: UserDTO['status']) => Promise<void>;
}

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  COURIER: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  DONOR: 'bg-amber-50 text-amber-800 ring-amber-600/15',
  RECIPIENT: 'bg-blue-50 text-blue-700 ring-blue-600/15',
};

function getDisplayName(user: AnyUserDTO): string {
  if (user.role === 'DONOR') return user.companyName || user.username;
  if (user.role === 'COURIER') return user.fullName || user.username;
  return user.username;
}

function getInitials(user: AnyUserDTO): string {
  return getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getDisplayId(id: string): string {
  return `#AFF-${id.slice(-5).toUpperCase()}`;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', ROLE_STYLES[role])}>
      {role[0] + role.slice(1).toLowerCase()}
    </span>
  );
}

/** Displays Admin account data as a desktop table and mobile cards. */
export function UserTable({ users, pendingUserIds, onStatusChange }: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-t-xl border border-admin-border/40 bg-admin-surface shadow-[0_2px_8px_rgba(0,35,111,0.08)]">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <caption className="sr-only">All AFF user accounts</caption>
          <thead className="bg-[#eff4ff] text-xs font-extrabold uppercase tracking-wider text-admin-title">
            <tr>
              <th scope="col" className="px-6 py-4">Account ID</th>
              <th scope="col" className="px-6 py-4">Username / Name</th>
              <th scope="col" className="px-6 py-4">Email</th>
              <th scope="col" className="px-6 py-4">Role</th>
              <th scope="col" className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/30 text-admin-text">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-[#f8f9ff]">
                <td className="whitespace-nowrap px-6 py-5 font-semibold" title={user.id}>{getDisplayId(user.id)}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e6edff] text-xs font-extrabold text-admin-title">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : getInitials(user)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{getDisplayName(user)}</p>
                      {getDisplayName(user) !== user.username && <p className="truncate text-xs text-admin-text-muted">@{user.username}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-slate-600">{user.email}</td>
                <td className="px-6 py-5"><RoleBadge role={user.role} /></td>
                <td className="px-6 py-5">
                  <AccountStatusControl
                    user={user}
                    isPending={pendingUserIds.has(user.id)}
                    onStatusChange={onStatusChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-admin-border/30 md:hidden">
        {users.map((user) => (
          <article key={user.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e6edff] text-xs font-extrabold text-admin-title">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : getInitials(user)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{getDisplayName(user)}</p>
                <p className="truncate text-sm text-admin-text-muted">{user.email}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-[#f8f9ff] p-3">
              <div>
                <dt className="text-[0.65rem] font-extrabold uppercase tracking-wider text-admin-text-muted">Account ID</dt>
                <dd className="mt-1 text-sm font-semibold" title={user.id}>{getDisplayId(user.id)}</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-extrabold uppercase tracking-wider text-admin-text-muted">Role</dt>
                <dd className="mt-1"><RoleBadge role={user.role} /></dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-admin-text-muted">Status</span>
              <AccountStatusControl
                user={user}
                isPending={pendingUserIds.has(user.id)}
                onStatusChange={onStatusChange}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default UserTable;
