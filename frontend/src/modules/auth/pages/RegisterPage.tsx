// Registration page screen for new AFF recipients and donors.
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../../../shared/components/Button/Button.jsx';

export function RegisterPage() {
  const { register } = useAuth();

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    register({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    });
  }

  return (
    <main>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <label>
          Role
          <select name="role" defaultValue="RECIPIENT">
            <option value="RECIPIENT">Recipient</option>
            <option value="DONOR">Donor</option>
          </select>
        </label>
        <Button type="submit">Register</Button>
      </form>
    </main>
  );
}
