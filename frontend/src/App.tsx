// Keeps the top-level frontend app small and delegates page routing to app/router.tsx.
import { AppRouter } from './app/router';

export default function App() {
  return <AppRouter />;
}
