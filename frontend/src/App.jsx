// Keeps the top-level frontend app small and delegates page routing to app/router.jsx.
import { AppRouter } from './app/router.jsx';

export default function App() {
  return <AppRouter />;
}
