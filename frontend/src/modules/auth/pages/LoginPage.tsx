// Login page screen for recipient, donor, and admin sign-in.
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button/Button';

export function LoginPage() {
  const { login } = useAuth();

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    login({
      email: formData.get('email'),
      password: formData.get('password'),
    });
  }

  return (
    <main>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <Button type="submit">Login</Button>
      </form>
    </main>
  );
}
