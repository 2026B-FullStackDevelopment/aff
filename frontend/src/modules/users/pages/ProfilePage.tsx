// Protected profile page that displays data from the existing GET /api/users/me endpoint.
import { useProfile } from '../hooks/useProfile';

export function ProfilePage() {
  const { profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <main>
        <h1>My Profile</h1>
        <p>Loading profile...</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main>
        <h1>My Profile</h1>
        <p>{error || 'Profile data is unavailable.'}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>My Profile</h1>
      <dl>
        <dt>Username</dt>
        <dd>{profile.username}</dd>
        <dt>Email</dt>
        <dd>{profile.email}</dd>
        <dt>Role</dt>
        <dd>{profile.role}</dd>
        <dt>Premium status</dt>
        <dd>{profile.role === 'RECIPIENT' ? (profile.tier === 'PREMIUM' ? 'Premium' : 'Standard') : '—'}</dd>
      </dl>
    </main>
  );
}
