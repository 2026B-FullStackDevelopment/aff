export interface UserRecord {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

interface UserTableProps {
  users: UserRecord[];
}

export function UserTable({ users }: UserTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
            <th scope="col" className="px-4 py-3.5">Name</th>
            <th scope="col" className="px-4 py-3.5">Email</th>
            <th scope="col" className="px-4 py-3.5">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-[#1e3a5f] capitalize">
                    {user.role}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
